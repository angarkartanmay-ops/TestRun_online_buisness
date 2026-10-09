import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { Ctx } from "./ctx";
import { drops, pledges, users, type Pledge, type User } from "./db/schema";
import { COUNTED, DropError, getDrop, getDropBySlug, isJoinable, logEvent, memberCount } from "./drops";
import { deliver, mails } from "./email";
import { money } from "./money";
import { currentPriceCents, tierIndexFor } from "./tiers";
import { rules } from "./rules";

export type JoinResult = {
  pledgeId: string;
  status: "held" | "requires_confirmation";
  clientSecret: string | null;
  holdCents: number;
  alreadyIn: boolean;
};

const ACTIVE = ["pending", "held", "capturing", "charged"] as const;

/**
 * Join a drop: create a pending pledge at the current price and place a hold.
 * Demo holds succeed immediately; Stripe holds need the member to confirm the
 * card in the browser, after which `confirmPledge` or the webhook marks it held.
 */
export async function joinDrop(
  ctx: Ctx,
  user: User,
  slug: string,
  opts: { referrerCode?: string | null; size?: string | null } = {},
): Promise<JoinResult & { after: (() => Promise<void>)[] }> {
  const drop = await getDropBySlug(ctx.db, slug);
  if (!drop) throw new DropError("not_found", "That drop doesn't exist.");
  const now = ctx.now();
  if (drop.status === "live" && now >= drop.closesAt) throw new DropError("closed", "This drop has closed.");
  if (!isJoinable(drop, now)) throw new DropError("not_open", "This drop isn't open for joining.");

  const existing = await activePledge(ctx, drop.id, user.id);
  if (existing) return resume(ctx, existing);

  let referrerId: string | null = null;
  const code = opts.referrerCode?.trim().toLowerCase();
  if (code && code !== user.crewCode) {
    const [ref] = await ctx.db.select({ id: users.id }).from(users).where(eq(users.crewCode, code)).limit(1);
    referrerId = ref?.id ?? null;
  }

  const holdCents = currentPriceCents(drop.tiers, drop.unlockedTier);
  let pledge: Pledge;
  try {
    const [row] = await ctx.db
      .insert(pledges)
      .values({
        dropId: drop.id,
        userId: user.id,
        heldCents: holdCents,
        referrerId,
        provider: ctx.payments.mode,
        size: opts.size?.slice(0, 16) ?? null,
      })
      .returning();
    pledge = row!;
  } catch (err) {
    // The partial unique index caught a double-click or a second tab.
    const raced = await activePledge(ctx, drop.id, user.id);
    if (raced) return resume(ctx, raced);
    throw err;
  }

  let hold;
  try {
    hold = await ctx.payments.createHold({
      amountCents: holdCents,
      currency: ctx.currency,
      email: user.email,
      description: `QUORUM hold — ${drop.brand} ${drop.item}`,
      pledgeId: pledge.id,
      dropId: drop.id,
    });
  } catch (err) {
    await ctx.db.update(pledges).set({ status: "failed", releaseReason: "hold_error", updatedAt: now }).where(eq(pledges.id, pledge.id));
    throw new DropError("payment_failed", "We couldn't start the card hold. Nothing was charged — try again.");
  }
  await ctx.db.update(pledges).set({ providerRef: hold.ref, updatedAt: now }).where(eq(pledges.id, pledge.id));

  const after: (() => Promise<void>)[] = [];
  if (hold.status === "held") after.push(...(await markHeld(ctx, pledge.id)));
  return {
    pledgeId: pledge.id,
    status: hold.status === "held" ? "held" : "requires_confirmation",
    clientSecret: hold.clientSecret,
    holdCents,
    alreadyIn: false,
    after,
  };
}

async function activePledge(ctx: Ctx, dropId: string, userId: string) {
  const [p] = await ctx.db
    .select()
    .from(pledges)
    .where(and(eq(pledges.dropId, dropId), eq(pledges.userId, userId), inArray(pledges.status, [...ACTIVE])))
    .limit(1);
  return p ?? null;
}

async function resume(ctx: Ctx, p: Pledge): Promise<JoinResult & { after: (() => Promise<void>)[] }> {
  if (p.status !== "pending" || !p.providerRef) {
    return { pledgeId: p.id, status: "held", clientSecret: null, holdCents: p.heldCents, alreadyIn: true, after: [] };
  }
  const r = await ctx.payments.resumeHold(p.providerRef);
  const after = r.status === "held" ? await markHeld(ctx, p.id) : [];
  return {
    pledgeId: p.id,
    status: r.status === "held" ? "held" : "requires_confirmation",
    clientSecret: r.clientSecret,
    holdCents: p.heldCents,
    alreadyIn: false,
    after,
  };
}

/**
 * The hold succeeded: count the member, advance the ratchet, log it. Idempotent —
 * the browser confirmation and the Stripe webhook can both call it safely.
 * Returns follow-up work (emails) for the caller to run after responding.
 */
export async function markHeld(ctx: Ctx, pledgeId: string): Promise<(() => Promise<void>)[]> {
  const now = ctx.now();
  const [p] = await ctx.db
    .update(pledges)
    .set({ status: "held", heldAt: now, updatedAt: now })
    .where(and(eq(pledges.id, pledgeId), eq(pledges.status, "pending")))
    .returning();
  if (!p) return [];

  const drop = await getDrop(ctx.db, p.dropId);
  if (!drop) return [];
  await logEvent(ctx.db, drop.id, "joined", p.referrerId ? "Joined from a crew link" : "Joined");
  const unlocked = await applyRatchet(ctx, drop.id);

  const [owner] = await ctx.db.select().from(users).where(eq(users.id, p.userId)).limit(1);
  const tasks: (() => Promise<void>)[] = [];
  if (owner) {
    tasks.push(async () => {
      await deliver(ctx, mails.joined(ctx, owner.email, drop, p.heldCents, `${ctx.siteUrl}/drops/${drop.slug}?c=${owner.crewCode}`, drop.closesAt));
    });
  }
  for (const idx of unlocked) tasks.push(() => notifyTierUnlocked(ctx, drop.id, idx));
  return tasks;
}

/**
 * Advance the ratchet to match the current count. GREATEST() makes it monotonic
 * even under concurrent joins; a stale count can only fail to raise it, never
 * lower it, and settlement re-runs this before capturing.
 */
export async function applyRatchet(ctx: Ctx, dropId: string): Promise<number[]> {
  const drop = await getDrop(ctx.db, dropId);
  if (!drop) return [];
  const members = await memberCount(ctx.db, dropId);
  const target = tierIndexFor(drop.tiers, members);
  if (target <= drop.unlockedTier) return [];

  const [before] = await ctx.db
    .select({ t: drops.unlockedTier })
    .from(drops)
    .where(eq(drops.id, dropId));
  const [after] = await ctx.db
    .update(drops)
    .set({ unlockedTier: sql`GREATEST(${drops.unlockedTier}, ${target})`, updatedAt: ctx.now() })
    .where(and(eq(drops.id, dropId), sql`${drops.unlockedTier} < ${target}`))
    .returning({ t: drops.unlockedTier });
  if (!after || !before) return [];

  const newly: number[] = [];
  for (let i = before.t + 1; i <= after.t; i++) {
    newly.push(i);
    const tier = drop.tiers[i]!;
    await logEvent(
      ctx.db,
      dropId,
      "tier_unlocked",
      i === 0
        ? `Quorum met — opens at ${money(tier.priceCents, ctx.currency)}`
        : `Tier ${i + 1} unlocked — ${money(tier.priceCents, ctx.currency)} for everyone`,
    );
  }
  return newly;
}

async function notifyTierUnlocked(ctx: Ctx, dropId: string, tierIdx: number) {
  const drop = await getDrop(ctx.db, dropId);
  if (!drop || tierIdx === 0) return; // quorum alone doesn't change anyone's hold
  const tier = drop.tiers[tierIdx];
  // Skip if a later tier has already superseded this one — one email, the best news.
  if (!tier || drop.unlockedTier !== tierIdx) return;
  const members = await memberCount(ctx.db, dropId);
  const rows = await ctx.db
    .select({ email: users.email })
    .from(pledges)
    .innerJoin(users, eq(users.id, pledges.userId))
    .where(and(eq(pledges.dropId, dropId), eq(pledges.status, "held")));
  for (const r of rows) await deliver(ctx, mails.tierUnlocked(ctx, r.email, drop, tier.priceCents, members));
}

/** Called by the browser after Stripe confirms the card. Re-checks with the provider. */
export async function confirmPledge(ctx: Ctx, user: User, pledgeId: string) {
  const p = await ownPledge(ctx, user, pledgeId);
  if (p.status !== "pending") return { status: p.status, after: [] as (() => Promise<void>)[] };
  if (!p.providerRef) throw new DropError("payment_failed", "This hold was never started.");
  const status = await ctx.payments.getStatus(p.providerRef);
  if (status === "held") return { status: "held" as const, after: await markHeld(ctx, p.id) };
  if (status === "canceled" || status === "failed") {
    await ctx.db.update(pledges).set({ status: "failed", releaseReason: "card_declined", updatedAt: ctx.now() }).where(eq(pledges.id, p.id));
    return { status: "failed" as const, after: [] };
  }
  return { status: "pending" as const, after: [] };
}

/**
 * Leaving is free before quorum and within the grace window after joining. After
 * that your membership is what's holding the price down for everyone else.
 */
export function canLeave(p: Pick<Pledge, "status" | "heldAt">, drop: { unlockedTier: number }, now: Date): boolean {
  if (p.status === "pending") return true;
  if (p.status !== "held") return false;
  if (drop.unlockedTier < 0) return true;
  return Boolean(p.heldAt && now.getTime() - p.heldAt.getTime() < rules.leaveGraceMinutes * 60_000);
}

export async function leavePledge(ctx: Ctx, user: User, pledgeId: string) {
  const p = await ownPledge(ctx, user, pledgeId);
  const drop = await getDrop(ctx.db, p.dropId);
  if (!drop || !isJoinable(drop, ctx.now())) throw new DropError("cannot_leave", "This drop has closed — holds are settled automatically.");
  if (!canLeave(p, drop, ctx.now())) {
    throw new DropError(
      "cannot_leave",
      `Quorum's met and it's been over ${rules.leaveGraceMinutes} minutes since you joined, so you're locked in — your spot is part of what's holding the price down.`,
    );
  }
  const [claimed] = await ctx.db
    .update(pledges)
    .set({ status: "released", releaseReason: "left", settledAt: ctx.now(), updatedAt: ctx.now() })
    .where(and(eq(pledges.id, p.id), inArray(pledges.status, ["pending", "held"])))
    .returning();
  if (!claimed) return { after: [] as (() => Promise<void>)[] };
  if (p.providerRef) await ctx.payments.release(p.providerRef, `release-${p.id}`);
  return { after: [async () => void (await deliver(ctx, mails.released(ctx, user.email, drop, "left")))] };
}

async function ownPledge(ctx: Ctx, user: User, pledgeId: string): Promise<Pledge> {
  const [p] = await ctx.db.select().from(pledges).where(eq(pledges.id, pledgeId)).limit(1);
  if (!p || p.userId !== user.id) throw new DropError("not_found", "That pledge doesn't exist.");
  return p;
}

/** A member's pledges with their drops, newest first, for the account page. */
export async function pledgesForUser(ctx: Ctx, userId: string) {
  return ctx.db
    .select({ pledge: pledges, drop: drops })
    .from(pledges)
    .innerJoin(drops, eq(drops.id, pledges.dropId))
    .where(and(eq(pledges.userId, userId), inArray(pledges.status, ["pending", "held", "capturing", "charged", "released", "failed"])))
    .orderBy(desc(pledges.createdAt));
}

/** How many members a person's crew link has brought in, across all drops. */
export async function crewSize(ctx: Ctx, userId: string): Promise<number> {
  const [row] = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(pledges)
    .where(and(eq(pledges.referrerId, userId), inArray(pledges.status, [...COUNTED])));
  return row?.n ?? 0;
}


