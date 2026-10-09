import { and, eq, inArray, lte, or, sql } from "drizzle-orm";
import type { Ctx } from "./ctx";
import { drops, payouts, pledges, users, type Drop } from "./db/schema";
import { getDrop, logEvent } from "./drops";
import { deliver, mails } from "./email";
import { bps, money } from "./money";
import { applyRatchet } from "./pledges";
import { HoldExpiredError } from "./payments/types";
import { rules } from "./rules";

export type SettleOutcome =
  | { dropId: string; result: "skipped" }
  | { dropId: string; result: "succeeded"; finalPriceCents: number; charged: number }
  | { dropId: string; result: "failed"; released: number }
  | { dropId: string; result: "incomplete"; remaining: number };

/** A capture claim older than this is assumed to belong to a crashed worker. */
const STALE_CLAIM_MS = 5 * 60_000;

/**
 * Close a drop that has passed its deadline. Safe to call repeatedly and
 * concurrently: the drop is claimed atomically, each pledge is claimed before
 * capture, and capture/release use idempotency keys, so a crash midway resumes
 * cleanly on the next run (cron, a page view, or the admin's button).
 */
export async function settleDrop(ctx: Ctx, dropId: string): Promise<SettleOutcome> {
  const now = ctx.now();
  const [drop] = await ctx.db
    .update(drops)
    .set({ status: "settling", updatedAt: now })
    .where(and(eq(drops.id, dropId), inArray(drops.status, ["live", "settling"]), lte(drops.closesAt, now)))
    .returning();
  if (!drop) return { dropId, result: "skipped" };

  // Final ratchet with every confirmed hold counted.
  await applyRatchet(ctx, drop.id);
  const fresh = (await getDrop(ctx.db, drop.id))!;

  // Holds that were never confirmed don't count and are cancelled.
  const pending = await ctx.db
    .update(pledges)
    .set({ status: "released", releaseReason: "never_confirmed", settledAt: now, updatedAt: now })
    .where(and(eq(pledges.dropId, drop.id), eq(pledges.status, "pending")))
    .returning();
  for (const p of pending) if (p.providerRef) await safeRelease(ctx, p.providerRef, p.id);

  return fresh.unlockedTier >= 0 ? captureAll(ctx, fresh) : releaseAll(ctx, fresh, "missed_quorum");
}

async function captureAll(ctx: Ctx, drop: Drop): Promise<SettleOutcome> {
  const finalPriceCents = drop.tiers[drop.unlockedTier]!.priceCents;

  const staleCutoff = () => new Date(ctx.now().getTime() - STALE_CLAIM_MS);
  const claimable = () =>
    or(eq(pledges.status, "held"), and(eq(pledges.status, "capturing"), lte(pledges.updatedAt, staleCutoff())));

  // Snapshot the work list, then claim each pledge individually. A pledge another
  // worker claimed first simply fails the conditional update and is skipped.
  const candidates = await ctx.db
    .select({ id: pledges.id })
    .from(pledges)
    .where(and(eq(pledges.dropId, drop.id), claimable()));

  for (const { id } of candidates) {
    const [p] = await ctx.db
      .update(pledges)
      .set({ status: "capturing", updatedAt: ctx.now() })
      .where(and(eq(pledges.id, id), claimable()))
      .returning();
    if (!p) continue;

    // The ratchet guarantees final <= held; min() is belt and braces.
    const amount = Math.min(finalPriceCents, p.heldCents);
    try {
      if (p.providerRef) await ctx.payments.capture(p.providerRef, amount, `capture-${p.id}`);
      await ctx.db
        .update(pledges)
        .set({ status: "charged", chargedCents: amount, settledAt: ctx.now(), updatedAt: ctx.now() })
        .where(eq(pledges.id, p.id));
    } catch (err) {
      if (err instanceof HoldExpiredError) {
        await ctx.db
          .update(pledges)
          .set({ status: "failed", releaseReason: "hold_expired", settledAt: ctx.now(), updatedAt: ctx.now() })
          .where(eq(pledges.id, p.id));
      } else {
        // Transient (network, Stripe 5xx). Put it back; the next run retries with the
        // same idempotency key, so a capture that actually landed is not repeated.
        await ctx.db.update(pledges).set({ status: "held", updatedAt: ctx.now() }).where(eq(pledges.id, p.id));
        console.error(`[settle] capture failed for pledge ${p.id}:`, err);
      }
    }
  }

  const [left] = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(pledges)
    .where(and(eq(pledges.dropId, drop.id), inArray(pledges.status, ["held", "capturing"])));
  if ((left?.n ?? 0) > 0) return { dropId: drop.id, result: "incomplete", remaining: left!.n };

  const [done] = await ctx.db
    .update(drops)
    .set({ status: "succeeded", finalPriceCents, settledAt: ctx.now(), updatedAt: ctx.now() })
    .where(and(eq(drops.id, drop.id), eq(drops.status, "settling")))
    .returning();
  if (!done) return { dropId: drop.id, result: "skipped" };

  const total = await chargedMembers(ctx, drop.id);
  await logEvent(ctx.db, drop.id, "closed", `Closed at ${money(finalPriceCents, ctx.currency)} — ${total.length} members charged`);
  await recordPayouts(ctx, done);
  for (const m of total) await deliver(ctx, mails.charged(ctx, m.email, done, m.chargedCents ?? finalPriceCents, done.retailCents, done.shipBy));
  return { dropId: drop.id, result: "succeeded", finalPriceCents, charged: total.length };
}

async function releaseAll(ctx: Ctx, drop: Drop, reason: "missed_quorum" | "canceled"): Promise<SettleOutcome> {
  const now = ctx.now();
  const released = await ctx.db
    .update(pledges)
    .set({ status: "released", releaseReason: reason, settledAt: now, updatedAt: now })
    .where(and(eq(pledges.dropId, drop.id), inArray(pledges.status, ["held", "pending", "capturing"])))
    .returning();
  for (const p of released) if (p.providerRef) await safeRelease(ctx, p.providerRef, p.id);

  await ctx.db
    .update(drops)
    .set({ status: reason === "canceled" ? "canceled" : "failed", settledAt: now, updatedAt: now })
    .where(eq(drops.id, drop.id));
  await logEvent(
    ctx.db,
    drop.id,
    "closed",
    reason === "canceled" ? "Cancelled — every hold released" : `Missed quorum — ${released.length} holds released, nobody charged`,
  );

  const emails = released.length
    ? await ctx.db.select({ email: users.email }).from(users).where(inArray(users.id, released.map((p) => p.userId)))
    : [];
  for (const e of emails) await deliver(ctx, mails.released(ctx, e.email, drop, reason));
  return { dropId: drop.id, result: "failed", released: released.length };
}

async function safeRelease(ctx: Ctx, ref: string, pledgeId: string) {
  try {
    await ctx.payments.release(ref, `release-${pledgeId}`);
  } catch (err) {
    // An unreleased authorisation expires on its own within 7 days; log and move on.
    console.error(`[settle] release failed for pledge ${pledgeId}:`, err);
  }
}

async function chargedMembers(ctx: Ctx, dropId: string) {
  return ctx.db
    .select({ email: users.email, chargedCents: pledges.chargedCents })
    .from(pledges)
    .innerJoin(users, eq(users.id, pledges.userId))
    .where(and(eq(pledges.dropId, dropId), eq(pledges.status, "charged")));
}

/**
 * Hosts earn 3% of the volume they brought. A member counts toward whoever's crew
 * link they joined from (if that person is an approved host); members with no
 * crew link count toward the drop's own host.
 */
export async function recordPayouts(ctx: Ctx, drop: Drop) {
  const rows = await ctx.db
    .select({ referrerId: pledges.referrerId, cents: pledges.chargedCents })
    .from(pledges)
    .where(and(eq(pledges.dropId, drop.id), eq(pledges.status, "charged")));

  const byHost = new Map<string, { members: number; volume: number }>();
  for (const r of rows) {
    const hostId = r.referrerId ?? drop.hostUserId;
    if (!hostId) continue;
    const agg = byHost.get(hostId) ?? { members: 0, volume: 0 };
    agg.members += 1;
    agg.volume += r.cents ?? 0;
    byHost.set(hostId, agg);
  }
  if (byHost.size === 0) return;

  const approved = await ctx.db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, [...byHost.keys()]), eq(users.hostStatus, "approved")));
  for (const { id } of approved) {
    const agg = byHost.get(id)!;
    await ctx.db
      .insert(payouts)
      .values({
        hostUserId: id,
        dropId: drop.id,
        members: agg.members,
        volumeCents: agg.volume,
        amountCents: bps(agg.volume, rules.hostShareBps),
      })
      .onConflictDoNothing();
  }
}

/** Settle every drop past its deadline. Driven by cron and lazily by page views. */
export async function settleDue(ctx: Ctx): Promise<SettleOutcome[]> {
  const due = await ctx.db
    .select({ id: drops.id })
    .from(drops)
    .where(and(inArray(drops.status, ["live", "settling"]), lte(drops.closesAt, ctx.now())));
  const out: SettleOutcome[] = [];
  for (const d of due) out.push(await settleDrop(ctx, d.id));
  return out;
}

/** Admin: stop a drop early and release every hold. */
export async function cancelDrop(ctx: Ctx, dropId: string): Promise<SettleOutcome> {
  const [drop] = await ctx.db
    .update(drops)
    .set({ status: "settling", updatedAt: ctx.now() })
    .where(and(eq(drops.id, dropId), inArray(drops.status, ["draft", "live"])))
    .returning();
  if (!drop) return { dropId, result: "skipped" };
  return releaseAll(ctx, drop, "canceled");
}

/** Per-drop money summary for the admin view. */
export function economics(volumeCents: number) {
  const fee = bps(volumeCents, rules.feeBps);
  const host = bps(volumeCents, rules.hostShareBps);
  return { volume: volumeCents, fee, host, net: fee - host, brand: volumeCents - fee };
}


/** Admin: the brand has shipped. Clears the drop from the overdue list. */
export async function markShipped(ctx: Ctx, dropId: string) {
  await ctx.db
    .update(drops)
    .set({ shippedAt: ctx.now(), updatedAt: ctx.now() })
    .where(and(eq(drops.id, dropId), eq(drops.status, "succeeded")));
}

/** Cleared drops past their ship-by date with nothing shipped: Bylaw 5 says refund. */
export async function overdueDrops(ctx: Ctx) {
  const rows = await ctx.db.select().from(drops).where(and(eq(drops.status, "succeeded"), lte(drops.shipBy, ctx.now())));
  return rows.filter((d) => !d.shippedAt);
}

/**
 * Admin: refund every member of a cleared drop in full. Idempotent per pledge, and
 * resumable — a failure leaves the rest charged and the button can be pressed again.
 */
export async function refundDrop(ctx: Ctx, dropId: string): Promise<{ refunded: number; failed: number }> {
  const drop = await getDrop(ctx.db, dropId);
  if (!drop || drop.status !== "succeeded") return { refunded: 0, failed: 0 };
  const charged = await ctx.db.select().from(pledges).where(and(eq(pledges.dropId, dropId), eq(pledges.status, "charged")));
  let refunded = 0;
  let failed = 0;
  for (const p of charged) {
    try {
      if (p.providerRef) await ctx.payments.refund(p.providerRef, `refund-${p.id}`);
      await ctx.db.update(pledges).set({ status: "refunded", updatedAt: ctx.now() }).where(eq(pledges.id, p.id));
      refunded++;
    } catch (err) {
      failed++;
      console.error(`[refund] pledge ${p.id}:`, err);
    }
  }
  if (refunded > 0) {
    await logEvent(ctx.db, dropId, "closed", `Refunded ${refunded} members in full — ship-by date missed`);
    await ctx.db.update(payouts).set({ status: "void" }).where(and(eq(payouts.dropId, dropId), eq(payouts.status, "pending")));
  }
  return { refunded, failed };
}
