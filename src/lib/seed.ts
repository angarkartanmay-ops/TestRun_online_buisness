import { and, asc, desc, eq, gt, inArray, like, lt, sql } from "drizzle-orm";
import type { DB } from "./db";
import { dropEvents, drops, payouts, pledges, users, type NewDrop, type ReceiptLine } from "./db/schema";
import { money } from "./money";
import { tierIndexFor } from "./tiers";

/**
 * Practice drops: an Indian campus-merch catalogue for learning how a drop works.
 * Every one is flagged `practice` (labelled on the site, nobody ever pays), and
 * every simulated member uses the reserved `.invalid` TLD, so none can receive
 * mail or sign in. Groups and products are fictional; the costs are real
 * November 2026 quotes for Tiruppur, Ludhiana and print-on-demand.
 *
 * Every ladder is margin-safe: tiers sit where the factory price drops (15 →
 * small batch, 50 → bulk, 100 → bulk), and each carries its unit cost.
 */
const H = 3600_000;
const D = 24 * H;

type Seed = Omit<NewDrop, "opensAt" | "closesAt" | "shipBy"> & {
  closesInHours: number;
  members: number;
  crewShare: number;
  hosted?: boolean;
};

/** Rupees to paise. */
const rs = (rupees: number) => Math.round(rupees * 100);
const line = (label: string, rupees: number, note?: string, ours?: boolean): ReceiptLine => ({
  label,
  cents: rs(rupees),
  ...(note ? { note } : {}),
  ...(ours ? { ours } : {}),
});

const APPAREL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const HOODIE_SIZES = ["S", "M", "L", "XL", "XXL"];

const house = { kind: "house" as const, practice: true, hostShareBps: 500, feeBps: 0, countryOfOrigin: "India" };

/** Live practice drops. Re-created in a fresh batch whenever fewer than two are open. */
const LIVE: Seed[] = [
  {
    ...house,
    slug: "batch-27-hoodie",
    brand: "Batch of '27",
    item: "Batch Hoodie",
    blurb: "One hoodie for the whole batch, with the year on the sleeve. 400 GSM brushed fleece — it survives four winters and a hostel washing line.",
    spec: "400 GSM brushed fleece · oversized · sleeve + back print",
    category: "apparel", glyph: "hoodie", plate: "cobalt", sizes: HOODIE_SIZES,
    retailCents: rs(1299),
    tiers: [
      { min: 15, priceCents: rs(1049), costCents: rs(715) },
      { min: 50, priceCents: rs(899), costCents: rs(590) },
      { min: 100, priceCents: rs(799), costCents: rs(515) },
    ],
    origin: "Knit + stitched in Ludhiana, Punjab",
    status: "live", closesInHours: 110, members: 38, crewShare: 0.55, hosted: true,
  },
  {
    ...house,
    slug: "fest-crew-tee",
    brand: "Rang Fest Crew",
    item: "Crew Oversized Tee",
    blurb: "The tee the fest crew wears so everyone knows who to ask. Heavy enough not to go see-through under stage lights.",
    spec: "240 GSM combed cotton · oversized · 2-colour screen print",
    category: "apparel", glyph: "tshirt", plate: "sage", sizes: APPAREL_SIZES,
    retailCents: rs(799),
    tiers: [
      { min: 15, priceCents: rs(649), costCents: rs(415) },
      { min: 50, priceCents: rs(549), costCents: rs(365) },
      { min: 100, priceCents: rs(479), costCents: rs(320) },
    ],
    origin: "Knit + printed in Tiruppur, Tamil Nadu",
    status: "live", closesInHours: 43, members: 57, crewShare: 0.62,
  },
  {
    ...house,
    slug: "lit-soc-tote",
    brand: "Lit Soc",
    item: "Society Canvas Tote",
    blurb: "The society logo on 12 oz canvas that holds a laptop, two textbooks and a canteen run. Six more and it opens.",
    spec: "12 oz natural canvas · 1-colour print · inner pocket",
    category: "bags", glyph: "tote", plate: "butter", sizes: [],
    retailCents: rs(499),
    tiers: [
      { min: 15, priceCents: rs(399), costCents: rs(245) },
      { min: 50, priceCents: rs(329), costCents: rs(195) },
      { min: 100, priceCents: rs(279), costCents: rs(165) },
    ],
    origin: "Cut + printed in Erode, Tamil Nadu",
    status: "live", closesInHours: 136, members: 9, crewShare: 0.4,
  },
  {
    ...house,
    hostShareBps: 0,
    slug: "friends-test-tee",
    brand: "Your Group Chat",
    item: "Friends Test Tee",
    blurb: "The test drop. Five friends open it; fifteen get it at ₹549. Printed one at a time and shipped to each of you, so there's no minimum order to miss.",
    spec: "180 GSM cotton · regular fit · front print, printed on demand",
    category: "apparel", glyph: "tshirt", plate: "clay", sizes: APPAREL_SIZES,
    retailCents: rs(799),
    tiers: [
      { min: 5, priceCents: rs(699), costCents: rs(386) },
      { min: 10, priceCents: rs(599), costCents: rs(386) },
      { min: 15, priceCents: rs(549), costCents: rs(386) },
    ],
    origin: "Printed on demand in Chennai, Tamil Nadu",
    status: "live", closesInHours: 66, members: 7, crewShare: 0.3,
  },
];

/** Closed examples, seeded once: one cleared drop with its published receipt, one that missed. */
const HISTORY: Seed[] = [
  {
    ...house,
    slug: "freshers-26-tee",
    brand: "Freshers '26",
    item: "Freshers Tee",
    blurb: "Closed at 112 members on the floor tier. Every rupee of the ₹479 is on the receipt.",
    spec: "240 GSM combed cotton · regular fit · 2-colour screen print",
    category: "apparel", glyph: "tshirt", plate: "stone", sizes: APPAREL_SIZES,
    retailCents: rs(799),
    tiers: [
      { min: 15, priceCents: rs(649), costCents: rs(415) },
      { min: 50, priceCents: rs(549), costCents: rs(365) },
      { min: 100, priceCents: rs(479), costCents: rs(320) },
    ],
    origin: "Knit + printed in Tiruppur, Tamil Nadu",
    receipt: [
      line("240 GSM combed-cotton blank", 186, "Tiruppur, at 112 pieces"),
      line("Screen print, 2 colours, front + back", 72),
      line("Bulk courier to campus", 22, "one parcel, split per tee"),
      line("Fold, size sticker, poly bag", 10),
      line("Misprint + exchange reserve", 30),
      line("GST on the garment, 5%", 22.81, "included in the price"),
      line("Payment gateway, 2.36%", 11.3),
      line("Club fund, 5%", 23.95, "paid to Freshers '26"),
      line("QUORUM margin", 100.94, undefined, true),
    ],
    status: "succeeded", closesInHours: -12 * 24, members: 112, crewShare: 0.6, hosted: true,
  },
  {
    ...house,
    slug: "design-dept-varsity",
    brand: "Dept. of Design",
    item: "Varsity Jacket",
    blurb: "Missed quorum at 9 of 15. Nothing was made and nobody paid — ₹2,199 was too much to ask of a 40-person class.",
    spec: "Wool-blend body · faux-leather sleeves · chenille patch",
    category: "apparel", glyph: "coat", plate: "rust", sizes: HOODIE_SIZES,
    retailCents: rs(2799),
    tiers: [
      { min: 15, priceCents: rs(2199), costCents: rs(1350) },
      { min: 40, priceCents: rs(1899), costCents: rs(1180) },
      { min: 80, priceCents: rs(1699), costCents: rs(1060) },
    ],
    origin: "Stitched in Ludhiana, Punjab",
    status: "failed", closesInHours: -6 * 24, members: 9, crewShare: 0.2,
  },
];

/** The previous, pre-India sample catalogue. Removed on the next refresh if nobody real joined it. */
const LEGACY_SLUGS = [
  "wet-cement-loopback-tee", "nonsuch-selvedge-carpenter", "overtone-beryllium-iem", "keyhaus-seventy-five",
  "halfmoon-acetate-frames", "pale-machine-merino-beanie", "civic-duty-cordura-tote", "second-sunday-stoneware",
  "wet-cement-tee-run-01", "rook-waxed-field-jacket",
];

const POOL_SIZE = Math.max(...[...LIVE, ...HISTORY].map((s) => s.members));
const memberEmail = (i: number) => `member-${String(i + 1).padStart(4, "0")}@demo.quorum.invalid`;

/** The simulated members, created once and reused by every batch. */
async function memberPool(db: DB) {
  await db
    .insert(users)
    .values(Array.from({ length: POOL_SIZE }, (_, i) => ({ email: memberEmail(i), crewCode: `demo${(i + 1).toString(36).padStart(3, "0")}` })))
    .onConflictDoNothing();
  await db.insert(users).values({ email: "host@demo.quorum.invalid", crewCode: "demohost", hostStatus: "approved" }).onConflictDoNothing();
  const pool = await db.select({ id: users.id }).from(users).where(like(users.email, "member-%@demo.quorum.invalid")).orderBy(asc(users.email));
  const [host] = await db.select({ id: users.id }).from(users).where(eq(users.email, "host@demo.quorum.invalid")).limit(1);
  return { pool: pool.slice(0, POOL_SIZE), hostId: host?.id ?? null };
}

async function insertSeed(db: DB, s: Seed, now: Date, slugSuffix: string, pool: { id: string }[], hostId: string | null) {
  const { closesInHours, members, crewShare, hosted, ...fields } = s;
  const closesAt = new Date(now.getTime() + closesInHours * H);
  const windowH = 144;
  const opensAt = new Date(closesAt.getTime() - windowH * H);
  const unlocked = tierIndexFor(s.tiers, members);
  const settled = s.status === "succeeded" || s.status === "failed";
  const finalPrice = s.status === "succeeded" && unlocked >= 0 ? s.tiers[unlocked]!.priceCents : null;

  const [drop] = await db
    .insert(drops)
    .values({
      ...fields,
      slug: `${s.slug}${slugSuffix}`,
      opensAt,
      closesAt,
      shipBy: new Date(closesAt.getTime() + 21 * D),
      unlockedTier: unlocked,
      hostUserId: hosted ? hostId : null,
      finalPriceCents: finalPrice,
      settledAt: settled ? new Date(closesAt.getTime() + 2 * H) : null,
      shippedAt: s.status === "succeeded" ? new Date(closesAt.getTime() + 9 * D) : null,
    })
    .onConflictDoNothing()
    .returning();
  if (!drop) return null;

  const referrers = pool.slice(0, 20).map((u) => u.id);
  const span = Math.max(1, Math.min(now.getTime(), closesAt.getTime()) - opensAt.getTime());
  const sizes = s.sizes ?? [];
  const rows = pool.slice(0, members).map((u, i) => {
    const joinedAt = new Date(opensAt.getTime() + Math.floor((span * (i + 0.5)) / members));
    const priceAtJoin = s.tiers[Math.max(0, tierIndexFor(s.tiers, i))]!.priceCents;
    return {
      dropId: drop.id,
      userId: u.id,
      status: s.status === "succeeded" ? ("charged" as const) : s.status === "failed" ? ("released" as const) : ("held" as const),
      heldCents: priceAtJoin,
      chargedCents: finalPrice,
      referrerId: (i * 7919) % 100 < crewShare * 100 ? referrers[(i * 31) % referrers.length]! : null,
      provider: "demo" as const,
      providerRef: `demo_seed_${drop.slug}_${i}`,
      // Sizes skew to the middle, like a real batch: M and L are about half.
      size: sizes.length ? sizes[[1, 2, 2, 3, 3, 2, 4, 1, 3, 0, 5, 2][i % 12]! % sizes.length]! : null,
      releaseReason: s.status === "failed" ? "missed_quorum" : null,
      createdAt: joinedAt,
      updatedAt: joinedAt,
      heldAt: joinedAt,
      settledAt: settled ? drop.settledAt : null,
    };
  });
  for (let i = 0; i < rows.length; i += 400) await db.insert(pledges).values(rows.slice(i, i + 400));

  // Event history: tier unlocks at the moment each threshold was crossed, plus recent joins.
  const events: { dropId: string; kind: "joined" | "tier_unlocked" | "closed"; label: string; createdAt: Date }[] = [];
  s.tiers.forEach((t, i) => {
    const row = rows[t.min - 1];
    if (!row) return;
    events.push({
      dropId: drop.id,
      kind: "tier_unlocked",
      label: i === 0 ? `Quorum met — opens at ${money(t.priceCents)}` : `Tier ${i + 1} unlocked — ${money(t.priceCents)} for everyone`,
      createdAt: new Date(row.createdAt.getTime() + 1000),
    });
  });
  rows.slice(-5).forEach((row) =>
    events.push({ dropId: drop.id, kind: "joined", label: row.referrerId ? "Joined from a crew link" : "Joined", createdAt: row.createdAt }),
  );
  if (settled) {
    events.push({
      dropId: drop.id,
      kind: "closed",
      label: s.status === "succeeded" ? `Closed at ${money(finalPrice ?? 0)} — ${members} members` : `Missed quorum — ${members} in, nobody pays`,
      createdAt: drop.settledAt!,
    });
  }
  await db.insert(dropEvents).values(events);

  if (s.status === "succeeded" && hosted && hostId && finalPrice) {
    const direct = rows.filter((row) => !row.referrerId).length;
    await db
      .insert(payouts)
      .values({
        hostUserId: hostId,
        dropId: drop.id,
        members: direct,
        volumeCents: direct * finalPrice,
        amountCents: Math.round((direct * finalPrice * (s.hostShareBps ?? 500)) / 10_000),
        status: "paid",
        paidAt: new Date(closesAt.getTime() + 14 * D),
      })
      .onConflictDoNothing();
  }
  return drop;
}

/** First boot: the full practice catalogue — live drops plus the two closed examples. */
export async function seedDemo(db: DB, now = new Date()) {
  const { pool, hostId } = await memberPool(db);
  for (const s of [...LIVE, ...HISTORY]) await insertSeed(db, s, now, "", pool, hostId);
}

/**
 * Keep the board from ever going empty. Run by the daily cron when practice drops
 * are enabled: retires the old sample catalogue, deletes closed practice drops
 * after three weeks (keeping the newest cleared, missed and receipted examples),
 * opens a fresh batch whenever fewer than two practice drops are still open, and
 * restores the closed examples if they're missing.
 */
export async function refreshPracticeDrops(db: DB, now = new Date()): Promise<{ created: number; removed: number }> {
  let removed = 0;

  // 1. The pre-India sample catalogue, unless a real (non-.invalid) member joined it.
  const legacy = await db
    .delete(drops)
    .where(
      and(
        inArray(drops.slug, LEGACY_SLUGS),
        eq(drops.practice, false),
        sql`not exists (select 1 from pledges p join users u on u.id = p.user_id where p.drop_id = ${drops.id} and u.email not like '%.invalid')`,
      ),
    )
    .returning({ id: drops.id });
  removed += legacy.length;

  // 2. Closed practice drops older than three weeks, except the newest of each
  // outcome — and the newest with a published receipt, which the homepage shows.
  const withReceipt = sql`jsonb_array_length(${drops.receipt}) > 0`;
  const keep: string[] = [];
  for (const where of [eq(drops.status, "succeeded"), eq(drops.status, "failed"), and(eq(drops.status, "succeeded"), withReceipt)]) {
    const [newest] = await db
      .select({ id: drops.id })
      .from(drops)
      .where(and(eq(drops.practice, true), where))
      .orderBy(desc(drops.closesAt))
      .limit(1);
    if (newest) keep.push(newest.id);
  }
  const stale = await db
    .delete(drops)
    .where(
      and(
        eq(drops.practice, true),
        inArray(drops.status, ["succeeded", "failed", "canceled"]),
        lt(drops.closesAt, new Date(now.getTime() - 21 * D)),
        keep.length ? sql`${drops.id} not in (${sql.join(keep.map((k) => sql`${k}`), sql`, `)})` : sql`true`,
      ),
    )
    .returning({ id: drops.id });
  removed += stale.length;

  // 3. A fresh batch when the board is running low.
  const [open] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(drops)
    .where(and(eq(drops.practice, true), eq(drops.status, "live"), gt(drops.closesAt, now)));
  let created = 0;
  const suffix = `-${now.toISOString().slice(2, 13).replace(/[-T]/g, "")}`; // 2026-11-04T13 → "-26110413"
  if ((open?.n ?? 0) < 2) {
    const { pool, hostId } = await memberPool(db);
    for (const s of LIVE) if (await insertSeed(db, s, now, suffix, pool, hostId)) created++;
  }

  // 4. The closed examples — a cleared drop with its published receipt, and one
  // that missed quorum — if a database that wasn't empty at first boot lacks them.
  const missing: Seed[] = [];
  for (const s of HISTORY) {
    const [has] = await db
      .select({ id: drops.id })
      .from(drops)
      .where(and(eq(drops.practice, true), eq(drops.status, s.status!), s.receipt?.length ? withReceipt : sql`true`))
      .limit(1);
    if (!has) missing.push(s);
  }
  if (missing.length) {
    const { pool, hostId } = await memberPool(db);
    for (const s of missing) if (await insertSeed(db, s, now, suffix, pool, hostId)) created++;
  }
  return { created, removed };
}

/**
 * Remove every seeded row — and any other account on the reserved `.invalid` TLD
 * (RFC 2606), such as deployment smoke-test probes. No real person can own one.
 * Drops are removed only if every pledge on them came from such an account.
 */
export async function clearDemo(db: DB) {
  await db.execute(sql`delete from drops where id in (select distinct drop_id from pledges p join users u on u.id = p.user_id where u.email like '%.invalid') and id not in (select distinct drop_id from pledges p join users u on u.id = p.user_id where u.email not like '%.invalid')`);
  await db.execute(sql`delete from users where email like '%.invalid'`);
  await db.execute(sql`delete from login_codes where email like '%.invalid'`);
  await db.execute(sql`delete from email_log where "to" like '%.invalid'`);
}
