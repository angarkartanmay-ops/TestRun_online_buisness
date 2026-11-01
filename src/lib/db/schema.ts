import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * A rung on the price ladder. `min` members unlocks `priceCents` for everyone.
 * Amounts are in minor units (paise for INR, cents for USD). `costCents` is what
 * one unit costs to make and deliver at that quantity — required on house drops,
 * where QUORUM makes the item, so a ladder can never be priced below cost.
 */
export type Tier = { min: number; priceCents: number; costCents?: number };

/** `house`: QUORUM makes it to order. `partner`: an outside brand makes it and pays our fee. */
export const DROP_KINDS = ["house", "partner"] as const;
export type DropKind = (typeof DROP_KINDS)[number];

/** One line of a published cost receipt. `ours` marks QUORUM's own fee line. */
export type ReceiptLine = { label: string; cents: number; note?: string; ours?: boolean };

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  crewCode: text("crew_code").notNull().unique(),
  hostStatus: text("host_status", { enum: ["none", "pending", "approved", "rejected"] })
    .notNull()
    .default("none"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const loginCodes = pgTable(
  "login_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: ts("expires_at").notNull(),
    consumedAt: ts("consumed_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("login_codes_email_idx").on(t.email, t.createdAt)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** sha256 of the cookie token — the raw token is never stored. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const DROP_STATUSES = ["draft", "live", "settling", "succeeded", "failed", "canceled"] as const;
export type DropStatus = (typeof DROP_STATUSES)[number];

export const drops = pgTable(
  "drops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    brand: text("brand").notNull(),
    item: text("item").notNull(),
    blurb: text("blurb").notNull().default(""),
    spec: text("spec").notNull().default(""),
    category: text("category").notNull(),
    /** Specimen-plate visual used when the brand hasn't supplied photography. */
    glyph: text("glyph").notNull().default("tshirt"),
    plate: text("plate").notNull().default("sage"),
    imageUrl: text("image_url"),
    retailCents: integer("retail_cents").notNull(),
    tiers: jsonb("tiers").$type<Tier[]>().notNull(),
    /** The ratchet: highest tier ever unlocked. Only ever increases, so the price only falls. */
    unlockedTier: integer("unlocked_tier").notNull().default(-1),
    status: text("status", { enum: DROP_STATUSES }).notNull().default("draft"),
    opensAt: ts("opens_at").notNull(),
    closesAt: ts("closes_at").notNull(),
    shipBy: ts("ship_by").notNull(),
    origin: text("origin").notNull(),
    resaleIndex: doublePrecision("resale_index"),
    receipt: jsonb("receipt").$type<ReceiptLine[]>().notNull().default([]),
    hostUserId: uuid("host_user_id").references(() => users.id, { onDelete: "set null" }),
    finalPriceCents: integer("final_price_cents"),
    settledAt: ts("settled_at"),
    /** Set when the brand ships. Past shipBy without it, Bylaw 5 owes every member a refund. */
    shippedAt: ts("shipped_at"),
    /** Practice drops are for learning the mechanic: simulated members, nobody ever pays. */
    practice: boolean("practice").notNull().default(false),
    kind: text("kind", { enum: DROP_KINDS }).notNull().default("partner"),
    /** Partner drops: our fee. House drops: unused (our margin is the receipt's last line). */
    feeBps: integer("fee_bps").notNull().default(800),
    /** The host's (or club fund's) share of what the drop sells. */
    hostShareBps: integer("host_share_bps").notNull().default(300),
    /** Sizes a member picks from when joining. Empty: one size. */
    sizes: jsonb("sizes").$type<string[]>().notNull().default([]),
    countryOfOrigin: text("country_of_origin").notNull().default("India"),
    /** Drop-page views, for the pilot funnel. Approximate by design. */
    views: integer("views").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("drops_status_closes_idx").on(t.status, t.closesAt), index("drops_host_user_idx").on(t.hostUserId)],
);

/**
 * `awaiting_payment` exists only in pay-after-close mode: the drop cleared, the
 * member owes the final price, and hasn't paid it yet.
 */
export const PLEDGE_STATUSES = ["pending", "held", "capturing", "awaiting_payment", "charged", "released", "failed", "refunded"] as const;
export type PledgeStatus = (typeof PLEDGE_STATUSES)[number];

export const pledges = pgTable(
  "pledges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dropId: uuid("drop_id")
      .notNull()
      .references(() => drops.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status", { enum: PLEDGE_STATUSES }).notNull().default("pending"),
    /** The authorised ceiling. The ratchet guarantees the final price never exceeds it. */
    heldCents: integer("held_cents").notNull(),
    chargedCents: integer("charged_cents"),
    referrerId: uuid("referrer_id").references(() => users.id, { onDelete: "set null" }),
    provider: text("provider", { enum: ["stripe", "demo", "commit"] }).notNull(),
    providerRef: text("provider_ref"),
    size: text("size"),
    releaseReason: text("release_reason"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
    heldAt: ts("held_at"),
    settledAt: ts("settled_at"),
    /** Pay-after-close: where to pay (a payment-link URL), and by when. */
    payUrl: text("pay_url"),
    payBy: ts("pay_by"),
    /** The member tapped "I've paid" — a prompt for the admin to check, not proof. */
    paidClaimedAt: ts("paid_claimed_at"),
  },
  (t) => [
    // One active pledge per person per drop — bring friends, not a second card.
    uniqueIndex("pledges_one_active_per_user")
      .on(t.dropId, t.userId)
      .where(sql`status in ('pending', 'held', 'capturing', 'awaiting_payment', 'charged')`),
    index("pledges_drop_status_idx").on(t.dropId, t.status),
    index("pledges_user_idx").on(t.userId),
    index("pledges_provider_ref_idx").on(t.providerRef),
    index("pledges_referrer_idx").on(t.referrerId),
  ],
);

export const dropEvents = pgTable(
  "drop_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dropId: uuid("drop_id")
      .notNull()
      .references(() => drops.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["joined", "tier_unlocked", "closed"] }).notNull(),
    label: text("label").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("drop_events_drop_idx").on(t.dropId, t.createdAt)],
);

export const hostApplications = pgTable(
  "host_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupName: text("group_name").notNull(),
    groupSize: integer("group_size").notNull(),
    brief: text("brief").notNull(),
    status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
    createdAt: ts("created_at").notNull().defaultNow(),
    reviewedAt: ts("reviewed_at"),
  },
  (t) => [index("host_applications_user_idx").on(t.userId)],
);

export const brandApplications = pgTable("brand_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  brand: text("brand").notNull(),
  item: text("item").notNull(),
  factory: text("factory").notNull(),
  unitCostCents: integer("unit_cost_cents"),
  notes: text("notes").notNull().default(""),
  status: text("status", { enum: ["new", "contacted", "declined"] }).notNull().default("new"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const payouts = pgTable(
  "payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hostUserId: uuid("host_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dropId: uuid("drop_id")
      .notNull()
      .references(() => drops.id, { onDelete: "cascade" }),
    members: integer("members").notNull(),
    volumeCents: integer("volume_cents").notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: text("status", { enum: ["pending", "paid", "void"] }).notNull().default("pending"),
    createdAt: ts("created_at").notNull().defaultNow(),
    paidAt: ts("paid_at"),
  },
  (t) => [uniqueIndex("payouts_host_drop").on(t.hostUserId, t.dropId), index("payouts_drop_idx").on(t.dropId)],
);

/** Delivery log. Subjects only — bodies (which can hold login codes) are never stored. */
export const emailLog = pgTable("email_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  kind: text("kind").notNull(),
  status: text("status", { enum: ["sent", "logged", "failed"] }).notNull(),
  error: text("error"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Drop = typeof drops.$inferSelect;
export type NewDrop = typeof drops.$inferInsert;
export type Pledge = typeof pledges.$inferSelect;
export type DropEvent = typeof dropEvents.$inferSelect;
export type Payout = typeof payouts.$inferSelect;
