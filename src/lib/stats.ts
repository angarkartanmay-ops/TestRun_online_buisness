import { and, eq, inArray, sql } from "drizzle-orm";
import type { DB } from "./db";
import { drops, pledges } from "./db/schema";
import { COUNTED } from "./drops";

/** Headline numbers for the home page, computed from the ledger — never typed in. */
export async function unionStats(db: DB) {
  const [members] = await db
    .select({ n: sql<number>`count(distinct ${pledges.userId})::int` })
    .from(pledges)
    .where(inArray(pledges.status, [...COUNTED]));
  const [cleared] = await db.select({ n: sql<number>`count(*)::int` }).from(drops).where(eq(drops.status, "succeeded"));
  const [kept] = await db
    .select({ avg: sql<number>`coalesce(avg(${drops.retailCents} - ${pledges.chargedCents}), 0)::int` })
    .from(pledges)
    .innerJoin(drops, eq(drops.id, pledges.dropId))
    .where(and(eq(pledges.status, "charged")));
  const [live] = await db.select({ n: sql<number>`count(*)::int` }).from(drops).where(eq(drops.status, "live"));
  return { members: members?.n ?? 0, cleared: cleared?.n ?? 0, avgKeptCents: kept?.avg ?? 0, live: live?.n ?? 0 };
}
