import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import type { Ctx } from "./ctx";
import type { DB } from "./db";
import { dropEvents, drops, pledges, type Drop, type DropStatus } from "./db/schema";
import { ladderState, type LadderState } from "./tiers";

/** Pledges that count toward the ladder: promised/authorised, being settled, owed, or paid. */
export const COUNTED = ["held", "capturing", "awaiting_payment", "charged"] as const;

export class DropError extends Error {
  constructor(
    public code: "not_found" | "not_open" | "closed" | "already_in" | "cannot_leave" | "forbidden" | "payment_failed" | "invalid",
    message: string,
  ) {
    super(message);
  }
}

export async function memberCount(db: DB, dropId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(pledges)
    .where(and(eq(pledges.dropId, dropId), inArray(pledges.status, [...COUNTED])));
  return row?.n ?? 0;
}

export async function memberCounts(db: DB, dropIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>(dropIds.map((id) => [id, 0]));
  if (dropIds.length === 0) return out;
  const rows = await db
    .select({ dropId: pledges.dropId, n: count() })
    .from(pledges)
    .where(and(inArray(pledges.dropId, dropIds), inArray(pledges.status, [...COUNTED])))
    .groupBy(pledges.dropId);
  rows.forEach((r) => out.set(r.dropId, r.n));
  return out;
}

export async function getDropBySlug(db: DB, slug: string): Promise<Drop | null> {
  const [d] = await db.select().from(drops).where(eq(drops.slug, slug)).limit(1);
  return d ?? null;
}

export async function getDrop(db: DB, id: string): Promise<Drop | null> {
  const [d] = await db.select().from(drops).where(eq(drops.id, id)).limit(1);
  return d ?? null;
}

export type DropWithLadder = Drop & { members: number; ladder: LadderState };

export async function listDrops(db: DB, statuses: DropStatus[]): Promise<DropWithLadder[]> {
  const rows = await db.select().from(drops).where(inArray(drops.status, statuses)).orderBy(asc(drops.closesAt));
  const counts = await memberCounts(db, rows.map((r) => r.id));
  return rows.map((d) => {
    const members = counts.get(d.id) ?? 0;
    return { ...d, members, ladder: ladderState(d.tiers, members, d.unlockedTier) };
  });
}

export async function withLadder(db: DB, d: Drop): Promise<DropWithLadder> {
  const members = await memberCount(db, d.id);
  return { ...d, members, ladder: ladderState(d.tiers, members, d.unlockedTier) };
}

/** A drop is open to joins only while live, opened, and not yet past its close. */
export function isJoinable(d: Pick<Drop, "status" | "opensAt" | "closesAt">, now: Date): boolean {
  return d.status === "live" && d.opensAt <= now && now < d.closesAt;
}

/** Live but past close and not yet settled — settle lazily on the next request. */
export function isDueForSettlement(d: Pick<Drop, "status" | "closesAt">, now: Date): boolean {
  return (d.status === "live" || d.status === "settling") && d.closesAt <= now;
}

export type LiveState = {
  slug: string;
  status: DropStatus;
  closing: boolean;
  closesAt: string;
  members: number;
  ladder: LadderState;
  finalPriceCents: number | null;
  events: { kind: string; label: string; at: string }[];
};

/** The JSON the drop page polls. Small on purpose — it is fetched every few seconds. */
export async function liveState(ctx: Ctx, d: Drop): Promise<LiveState> {
  const members = await memberCount(ctx.db, d.id);
  const events = await ctx.db
    .select({ kind: dropEvents.kind, label: dropEvents.label, at: dropEvents.createdAt })
    .from(dropEvents)
    .where(eq(dropEvents.dropId, d.id))
    .orderBy(desc(dropEvents.createdAt))
    .limit(8);
  return {
    slug: d.slug,
    status: d.status,
    closing: isDueForSettlement(d, ctx.now()),
    closesAt: d.closesAt.toISOString(),
    members,
    ladder: ladderState(d.tiers, members, d.unlockedTier),
    finalPriceCents: d.finalPriceCents,
    events: events.map((e) => ({ kind: e.kind, label: e.label, at: e.at.toISOString() })),
  };
}

export async function logEvent(db: DB, dropId: string, kind: "joined" | "tier_unlocked" | "closed", label: string) {
  await db.insert(dropEvents).values({ dropId, kind, label });
}
