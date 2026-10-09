import { sql } from "drizzle-orm";
import type { DB } from "./db";
import { dropEvents, drops, payouts, pledges, users, type NewDrop, type ReceiptLine } from "./db/schema";
import { tierIndexFor } from "./tiers";

/**
 * Sample data for local development and preview deployments. Every seeded
 * account uses the reserved `.invalid` TLD, so none can receive mail or sign in,
 * and `npm run db:reset` removes all of it. Brands and products are fictional.
 */
const H = 3600_000;
const D = 24 * H;

type Seed = Omit<NewDrop, "opensAt" | "closesAt" | "shipBy"> & {
  closesInHours: number;
  members: number;
  crewShare: number;
  hosted?: boolean;
};

const r = (label: string, dollars: number, note?: string, ours?: boolean): ReceiptLine => ({
  label,
  cents: Math.round(dollars * 100),
  ...(note ? { note } : {}),
  ...(ours ? { ours } : {}),
});

const SEEDS: Seed[] = [
  {
    slug: "wet-cement-loopback-tee",
    brand: "Wet Cement",
    item: "12.4oz Loopback Tee",
    blurb: "The tee that made the first run sell out at the floor. Same Barcelos mill, same 12.4oz loopback, now in washed charcoal.",
    spec: "12.4oz loopback cotton · boxy fit · washed charcoal",
    category: "apparel", glyph: "tshirt", plate: "sage",
    retailCents: 5800,
    tiers: [{ min: 10, priceCents: 4100 }, { min: 60, priceCents: 3300 }, { min: 180, priceCents: 2700 }, { min: 400, priceCents: 2300 }],
    origin: "Knit + dyed in Barcelos, PT", resaleIndex: 0.71,
    status: "live", closesInHours: 61, members: 287, crewShare: 0.58, hosted: true,
  },
  {
    slug: "nonsuch-selvedge-carpenter",
    brand: "Nonsuch",
    item: "14oz Selvedge Carpenter",
    blurb: "Raw Okayama selvedge cut into a double-knee carpenter. Unwashed, so it fades to the way you move.",
    spec: "14oz raw selvedge · double knee · hammer loop",
    category: "apparel", glyph: "pants", plate: "cobalt",
    retailCents: 16800,
    tiers: [{ min: 12, priceCents: 12900 }, { min: 50, priceCents: 10800 }, { min: 150, priceCents: 9200 }, { min: 300, priceCents: 7900 }],
    origin: "Denim from Okayama, JP · sewn in Tijuana, MX", resaleIndex: 0.84,
    status: "live", closesInHours: 133, members: 142, crewShare: 0.47,
  },
  {
    slug: "overtone-beryllium-iem",
    brand: "Overtone Audio",
    item: "Wired IEM, Beryllium Driver",
    blurb: "Wired is back because the sound never left. A beryllium-coated 10mm driver in machined gunmetal shells.",
    spec: "10mm beryllium-coated driver · 4-core silver cable · 3.5mm",
    category: "audio", glyph: "headphones", plate: "smoke",
    retailCents: 7900,
    tiers: [{ min: 20, priceCents: 5800 }, { min: 120, priceCents: 4700 }, { min: 400, priceCents: 3900 }, { min: 800, priceCents: 3200 }],
    origin: "Assembled in Dongguan, CN", resaleIndex: 0.52,
    receipt: [
      r("Beryllium-coated 10mm drivers ×2", 6.8),
      r("CNC aluminium shells ×2", 5.2),
      r("Braided 4-core cable", 2.1),
      r("Assembly + QC, Dongguan", 2.4),
      r("Case + packaging", 1.15),
      r("Air freight", 0.95),
      r("US duty, HTS 8518.30.20 @ 4.9%", 0.86, "assessed on $17.65 FOB"),
      r("Card processing, 2.9% + $0.30", 1.23),
      r("Overtone's margin", 8.75),
      r("QUORUM fee, 8%", 2.56, undefined, true),
    ],
    status: "live", closesInHours: 19, members: 834, crewShare: 0.66, hosted: true,
  },
  {
    slug: "keyhaus-seventy-five",
    brand: "Keyhaus",
    item: "Seventy-Five Aluminium Kit",
    blurb: "A 75% gasket-mount board in a 1.9kg milled case. Hot-swap, so the switches are your call.",
    spec: "75% layout · gasket mount · hot-swap PCB · 1.9kg",
    category: "tech", glyph: "keyboard", plate: "mint",
    retailCents: 23900,
    tiers: [{ min: 15, priceCents: 18900 }, { min: 60, priceCents: 16400 }, { min: 150, priceCents: 14200 }, { min: 300, priceCents: 12500 }],
    origin: "Case milled in Shenzhen, CN · PCB assembled in Taipei, TW", resaleIndex: 0.88,
    receipt: [
      r("6063 aluminium case, milled + anodised", 38),
      r("Hot-swap PCB, assembled", 14.5),
      r("Brass plate + gasket kit", 9.8),
      r("Packaging + foam", 4.2),
      r("Ocean freight + drayage", 3.1),
      r("US duty, HTS 8471.60.20", 0, "keyboards enter duty-free"),
      r("Card processing, 2.9% + $0.30", 3.93),
      r("Keyhaus's margin", 41.47),
      r("QUORUM fee, 8%", 10, undefined, true),
    ],
    status: "live", closesInHours: 88, members: 96, crewShare: 0.71,
  },
  {
    slug: "halfmoon-acetate-frames",
    brand: "Halfmoon Optics",
    item: "Acetate Frames, Blue-Block",
    blurb: "Chunky tortoiseshell acetate, cut and tumbled for three days in Cadore. Needs six more to open.",
    spec: "Mazzucchelli acetate · 5-barrel hinge · blue-block lens",
    category: "objects", glyph: "eyeglasses", plate: "butter",
    retailCents: 14500,
    tiers: [{ min: 25, priceCents: 9800 }, { min: 100, priceCents: 8100 }, { min: 250, priceCents: 6900 }, { min: 500, priceCents: 5800 }],
    origin: "Acetate cut + tumbled in Cadore, IT", resaleIndex: 0.61,
    status: "live", closesInHours: 104, members: 19, crewShare: 0.32,
  },
  {
    slug: "pale-machine-merino-beanie",
    brand: "Pale Machine",
    item: "Merino Rib Beanie",
    blurb: "Fisherman cut in a burnt orange you'll be asked about. Biella yarn, knit in Porto.",
    spec: "100% extrafine merino · 2×2 rib · short cuff",
    category: "apparel", glyph: "yarn", plate: "clay",
    retailCents: 5200,
    tiers: [{ min: 10, priceCents: 3600 }, { min: 40, priceCents: 3000 }, { min: 120, priceCents: 2500 }, { min: 300, priceCents: 2100 }],
    origin: "Yarn spun in Biella, IT · knit in Porto, PT", resaleIndex: 0.44,
    status: "live", closesInHours: 44, members: 133, crewShare: 0.52,
  },
  {
    slug: "civic-duty-cordura-tote",
    brand: "Civic Duty",
    item: "1000D Cordura Tote",
    blurb: "Stands up on its own and outlives the laptop inside it. Two more members and it drops $12.",
    spec: "1000D Cordura · bar-tacked webbing · zip pocket",
    category: "bags", glyph: "tote", plate: "stone",
    retailCents: 9500,
    tiers: [{ min: 15, priceCents: 6800 }, { min: 60, priceCents: 5600 }, { min: 150, priceCents: 4700 }, { min: 300, priceCents: 4000 }],
    origin: "Cut + sewn in Ho Chi Minh City, VN", resaleIndex: 0.66,
    status: "live", closesInHours: 9, members: 58, crewShare: 0.6,
  },
  {
    slug: "second-sunday-stoneware",
    brand: "Second Sunday",
    item: "Stoneware Mugs, Set of Two",
    blurb: "One oatmeal, one cobalt, both slightly wrong in the way handmade things are.",
    spec: "Hand-thrown stoneware · 340ml · dishwasher safe",
    category: "objects", glyph: "coffee", plate: "rust",
    retailCents: 6800,
    tiers: [{ min: 12, priceCents: 4700 }, { min: 40, priceCents: 3900 }, { min: 100, priceCents: 3300 }, { min: 250, priceCents: 2800 }],
    origin: "Thrown in Stoke-on-Trent, UK", resaleIndex: 0.29,
    status: "live", closesInHours: 140, members: 41, crewShare: 0.41,
  },
  {
    slug: "wet-cement-tee-run-01",
    brand: "Wet Cement",
    item: "12.4oz Loopback Tee — Run 01",
    blurb: "The first run. Closed at 512 members on the floor tier.",
    spec: "12.4oz loopback cotton · boxy fit · bone",
    category: "apparel", glyph: "tshirt", plate: "sage",
    retailCents: 5800,
    tiers: [{ min: 10, priceCents: 4100 }, { min: 60, priceCents: 3300 }, { min: 180, priceCents: 2700 }, { min: 400, priceCents: 2300 }],
    origin: "Knit + dyed in Barcelos, PT", resaleIndex: 0.71,
    receipt: [
      r("Cotton knit blank, 12.4oz, Barcelos PT", 9.1),
      r("Cut & sew, 14 operations", 3.4),
      r("Reactive dye, single-colour lot", 1.15),
      r("Ocean freight + drayage", 0.62, "consolidated at 1,400 units"),
      r("US duty, HTS 6109.10.00 @ 16.5%", 1.79, "assessed on $10.85 FOB"),
      r("Card processing, 2.9% + $0.30", 0.97),
      r("Wet Cement's margin", 4.13),
      r("QUORUM fee, 8%", 1.84, undefined, true),
    ],
    status: "succeeded", closesInHours: -21 * 24, members: 512, crewShare: 0.61, hosted: true,
  },
  {
    slug: "rook-waxed-field-jacket",
    brand: "Rook Supply",
    item: "Waxed Canvas Field Jacket",
    blurb: "Missed quorum at 11 of 20. Nothing was made and nobody was charged — the ladder asked too much too early.",
    spec: "8oz waxed cotton canvas · corduroy collar",
    category: "apparel", glyph: "coat", plate: "smoke",
    retailCents: 26000,
    tiers: [{ min: 20, priceCents: 19800 }, { min: 80, priceCents: 17400 }, { min: 200, priceCents: 15200 }],
    origin: "Canvas from Halley Stevensons, Dundee · sewn in Leicester, UK", resaleIndex: 0.58,
    status: "failed", closesInHours: -9 * 24, members: 11, crewShare: 0.2,
  },
];

export async function seedDemo(db: DB, now = new Date()) {
  const maxMembers = Math.max(...SEEDS.map((s) => s.members));
  const pool = await db
    .insert(users)
    .values(
      Array.from({ length: maxMembers }, (_, i) => ({
        email: `member-${String(i + 1).padStart(4, "0")}@demo.quorum.invalid`,
        crewCode: `demo${(i + 1).toString(36).padStart(3, "0")}`,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: users.id });

  const [host] = await db
    .insert(users)
    .values({ email: "host@demo.quorum.invalid", crewCode: "demohost", hostStatus: "approved" })
    .onConflictDoNothing()
    .returning();
  const referrers = pool.slice(0, 40).map((u) => u.id);

  for (const s of SEEDS) {
    const { closesInHours, members, crewShare, hosted, ...fields } = s;
    const closesAt = new Date(now.getTime() + closesInHours * H);
    const windowH = Math.min(144, Math.max(48, closesInHours + 30));
    const opensAt = new Date(closesAt.getTime() - windowH * H);
    const unlocked = tierIndexFor(s.tiers, members);
    const settled = s.status === "succeeded" || s.status === "failed";
    const finalPrice = s.status === "succeeded" && unlocked >= 0 ? s.tiers[unlocked]!.priceCents : null;

    const [drop] = await db
      .insert(drops)
      .values({
        ...fields,
        opensAt,
        closesAt,
        shipBy: new Date(closesAt.getTime() + 42 * D),
        unlockedTier: unlocked,
        hostUserId: hosted && host ? host.id : null,
        finalPriceCents: finalPrice,
        settledAt: settled ? new Date(closesAt.getTime() + 2 * H) : null,
      })
      .onConflictDoNothing()
      .returning();
    if (!drop) continue;

    const span = Math.max(1, Math.min(now.getTime(), closesAt.getTime()) - opensAt.getTime());
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
        label: i === 0 ? `Quorum met — opens at $${t.priceCents / 100}` : `Tier ${i + 1} unlocked — $${t.priceCents / 100} for everyone`,
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
        label: s.status === "succeeded" ? `Closed at $${(finalPrice ?? 0) / 100} — ${members} members charged` : `Missed quorum — ${members} holds released, nobody charged`,
        createdAt: drop.settledAt!,
      });
    }
    await db.insert(dropEvents).values(events);

    if (s.status === "succeeded" && host && finalPrice) {
      const direct = rows.filter((row) => !row.referrerId).length;
      await db
        .insert(payouts)
        .values({ hostUserId: host.id, dropId: drop.id, members: direct, volumeCents: direct * finalPrice, amountCents: Math.round(direct * finalPrice * 0.03), status: "paid", paidAt: new Date(closesAt.getTime() + 14 * D) })
        .onConflictDoNothing();
    }
  }
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
