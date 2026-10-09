import { randomUUID } from "node:crypto";
import { createPglite } from "@/lib/db/pglite";
import type { Ctx } from "@/lib/ctx";
import { drops, users, type NewDrop, type User } from "@/lib/db/schema";
import { memoryMailer } from "@/lib/mailer";
import { HoldExpiredError, type HoldStatus, type Payments } from "@/lib/payments/types";
import { findOrCreateUser } from "@/lib/auth";

type Hold = { amount: number; status: HoldStatus; captured?: number };

/**
 * A Stripe stand-in with the rules that matter: holds may need browser
 * confirmation, captures can't exceed the authorised amount, an expired hold
 * can't be captured, and a repeated idempotency key doesn't capture twice.
 */
export function fakeStripe(opts: { autoConfirm?: boolean } = {}) {
  const holds = new Map<string, Hold>();
  const seenKeys = new Set<string>();
  let failNextCaptures = 0;
  const p: Payments & {
    holds: typeof holds;
    confirm(ref: string): void;
    expire(ref: string): void;
    failCaptures(n: number): void;
  } = {
    mode: "stripe",
    holds,
    confirm(ref) {
      holds.get(ref)!.status = "held";
    },
    expire(ref) {
      holds.get(ref)!.status = "canceled";
    },
    failCaptures(n) {
      failNextCaptures = n;
    },
    async createHold({ amountCents }) {
      const ref = `pi_${randomUUID().slice(0, 8)}`;
      holds.set(ref, { amount: amountCents, status: opts.autoConfirm ? "held" : "requires_confirmation" });
      return { ref, clientSecret: `${ref}_secret`, status: holds.get(ref)!.status };
    },
    async resumeHold(ref) {
      return { clientSecret: `${ref}_secret`, status: holds.get(ref)!.status };
    },
    async getStatus(ref) {
      return holds.get(ref)!.status;
    },
    async capture(ref, amount, key) {
      const h = holds.get(ref)!;
      if (seenKeys.has(key) && h.status === "captured") return;
      if (failNextCaptures > 0) {
        failNextCaptures--;
        throw new Error("network blip");
      }
      if (h.status === "canceled") throw new HoldExpiredError(ref);
      if (h.status !== "held") throw new Error(`cannot capture a ${h.status} hold`);
      if (amount > h.amount) throw new Error(`capture ${amount} exceeds authorised ${h.amount}`);
      seenKeys.add(key);
      h.status = "captured";
      h.captured = amount;
    },
    async release(ref) {
      const h = holds.get(ref);
      if (h && h.status !== "captured") h.status = "canceled";
    },
    async refund(ref) {
      const h = holds.get(ref)!;
      if (h.status !== "captured") throw new Error("can only refund a captured payment");
      h.status = "canceled";
    },
  };
  return p;
}

export async function makeCtx(payments: Payments = fakeStripe({ autoConfirm: true })) {
  const db = await createPglite();
  const mailer = memoryMailer();
  let clock = new Date("2026-10-01T12:00:00Z").getTime();
  const ctx: Ctx = {
    db,
    payments,
    mailer,
    now: () => new Date(clock),
    siteUrl: "https://quorum.test",
    currency: "usd",
  };
  return {
    ctx,
    mailer,
    advance: (ms: number) => void (clock += ms),
    setNow: (d: Date) => void (clock = d.getTime()),
  };
}

let n = 0;
export async function makeUser(ctx: Ctx, email?: string): Promise<User> {
  return findOrCreateUser(ctx, email ?? `member${++n}-${randomUUID().slice(0, 6)}@example.com`);
}

export async function makeDrop(ctx: Ctx, overrides: Partial<NewDrop> = {}) {
  const now = ctx.now();
  const [d] = await ctx.db
    .insert(drops)
    .values({
      slug: `drop-${randomUUID().slice(0, 8)}`,
      brand: "Test Brand",
      item: "Test Tee",
      category: "apparel",
      retailCents: 5800,
      tiers: [
        { min: 3, priceCents: 4100 },
        { min: 5, priceCents: 3300 },
        { min: 8, priceCents: 2300 },
      ],
      status: "live",
      opensAt: new Date(now.getTime() - 3600_000),
      closesAt: new Date(now.getTime() + 72 * 3600_000),
      shipBy: new Date(now.getTime() + 40 * 86400_000),
      origin: "Barcelos, PT",
      ...overrides,
    })
    .returning();
  return d!;
}

export { users };
