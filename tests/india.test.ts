import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { payouts, pledges, users } from "@/lib/db/schema";
import { DropError, getDrop, memberCount } from "@/lib/drops";
import { mails } from "@/lib/email";
import { commitPayments } from "@/lib/payments/commit";
import { paidPledgeId, razorpayClient, verifyRazorpaySignature, type RazorpayClient } from "@/lib/payments/razorpay";
import { joinDrop, leavePledge } from "@/lib/pledges";
import { claimPaid, closeCollection, economics, markPaid, settleDrop, upiFor } from "@/lib/settle";
import { tierMargins, validateTiers } from "@/lib/tiers";
import { payRef, upiLink } from "@/lib/upi";
import { createHmac } from "node:crypto";
import { fakeStripe, makeCtx, makeDrop, makeUser } from "./support/harness";

const H = 3600_000;

const HOODIE = [
  { min: 3, priceCents: 104900, costCents: 71500 },
  { min: 5, priceCents: 89900, costCents: 59000 },
  { min: 8, priceCents: 79900, costCents: 51500 },
];

async function commitCtx(opts: { razorpay?: RazorpayClient } = {}) {
  const made = await makeCtx(commitPayments);
  made.ctx.currency = "inr";
  made.ctx.upi = { vpa: "quorum@okaxis", payee: "QUORUM" };
  made.ctx.razorpay = opts.razorpay ?? null;
  return made;
}

async function join(ctx: Awaited<ReturnType<typeof makeCtx>>["ctx"], slug: string, n: number, size?: string) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const u = await makeUser(ctx);
    const r = await joinDrop(ctx, u, slug, { size });
    for (const t of r.after) await t();
    out.push({ user: u, pledgeId: r.pledgeId });
  }
  return out;
}

describe("pay after close", () => {
  it("joining is a promise: counted at once, nothing held, nothing to refund on a miss", async () => {
    const { ctx, mailer, advance } = await commitCtx();
    const drop = await makeDrop(ctx, { tiers: HOODIE, retailCents: 129900, kind: "house", hostShareBps: 500 });
    await join(ctx, drop.slug, 2);
    expect(await memberCount(ctx.db, drop.id)).toBe(2);
    expect(mailer.outbox.find((m) => m.kind === "joined")!.text).toMatch(/Nothing to pay now/);

    advance(73 * H);
    const r = await settleDrop(ctx, drop.id);
    expect(r.result).toBe("failed");
    const rows = await ctx.db.select().from(pledges).where(eq(pledges.dropId, drop.id));
    expect(rows.every((p) => p.status === "released" && p.chargedCents === null)).toBe(true);
    expect(mailer.outbox.find((m) => m.kind === "released")!.text).toMatch(/nothing to refund/);
  });

  it("at close, everyone owes the final price, gets a UPI link, and is counted paid when marked", async () => {
    const { ctx, mailer, advance } = await commitCtx();
    const drop = await makeDrop(ctx, { tiers: HOODIE, retailCents: 129900, kind: "house", hostShareBps: 500 });
    const members = await join(ctx, drop.slug, 6);

    advance(73 * H);
    const r = await settleDrop(ctx, drop.id);
    expect(r).toMatchObject({ result: "succeeded", finalPriceCents: 89900, charged: 6 });

    const rows = await ctx.db.select().from(pledges).where(eq(pledges.dropId, drop.id));
    expect(rows.every((p) => p.status === "awaiting_payment" && p.chargedCents === 89900)).toBe(true);
    expect(rows[0]!.payBy!.getTime()).toBe(ctx.now().getTime() + 48 * H);

    const pay = mailer.outbox.filter((m) => m.kind === "pay_now");
    expect(pay).toHaveLength(6);
    expect(pay[0]!.subject).toMatch(/pay ₹899/);
    expect(pay[0]!.text).toMatch(/quorum@okaxis/);
    expect(pay[0]!.text).toMatch(/QRM-[0-9A-F]{6}/);

    const link = upiFor(ctx, rows[0]!)!;
    expect(link).toMatch(/^upi:\/\/pay\?pa=quorum%40okaxis&pn=QUORUM&am=899\.00&cu=INR&tn=QRM-/);

    // The member says they've paid; the admin checks and confirms. Twice is harmless.
    await claimPaid(ctx, members[0]!.user.id, members[0]!.pledgeId);
    expect(await markPaid(ctx, members[0]!.pledgeId)).toBe(true);
    expect(await markPaid(ctx, members[0]!.pledgeId)).toBe(false);
    const [paid] = await ctx.db.select().from(pledges).where(eq(pledges.id, members[0]!.pledgeId));
    expect(paid).toMatchObject({ status: "charged", chargedCents: 89900 });
    expect(paid!.paidClaimedAt).not.toBeNull();
    expect(mailer.outbox.filter((m) => m.kind === "paid")).toHaveLength(1);

    // Someone else's pledge can't be claimed.
    await expect(claimPaid(ctx, members[0]!.user.id, members[1]!.pledgeId)).rejects.toBeInstanceOf(DropError);
  });

  it("closing collection releases unpaid spots and pays the club fund on what was paid", async () => {
    const { ctx, mailer, advance } = await commitCtx();
    const host = await makeUser(ctx);
    await ctx.db.update(users).set({ hostStatus: "approved" }).where(eq(users.id, host.id));
    const drop = await makeDrop(ctx, { tiers: HOODIE, retailCents: 129900, kind: "house", hostShareBps: 500, hostUserId: host.id });
    const members = await join(ctx, drop.slug, 5);
    advance(73 * H);
    await settleDrop(ctx, drop.id);
    for (const m of members.slice(0, 4)) await markPaid(ctx, m.pledgeId);

    // No payouts until collection closes — only paid volume counts.
    expect(await ctx.db.select().from(payouts)).toHaveLength(0);
    const r = await closeCollection(ctx, drop.id);
    expect(r.released).toBe(1);
    const [unpaid] = await ctx.db.select().from(pledges).where(eq(pledges.id, members[4]!.pledgeId));
    expect(unpaid).toMatchObject({ status: "failed", releaseReason: "unpaid" });
    expect(mailer.outbox.filter((m) => m.kind === "unpaid")).toHaveLength(1);

    const [payout] = await ctx.db.select().from(payouts);
    expect(payout).toMatchObject({ hostUserId: host.id, members: 4, volumeCents: 4 * 89900, amountCents: Math.round(4 * 89900 * 0.05) });
    // The price stays where the group put it.
    expect((await getDrop(ctx.db, drop.id))!.finalPriceCents).toBe(89900);
  });

  it("uses a Razorpay payment link when configured, and falls back to UPI if creating one fails", async () => {
    let calls = 0;
    const razorpay: RazorpayClient = {
      async createPaymentLink(i) {
        calls++;
        if (calls === 2) throw new Error("Razorpay 500");
        return { id: `plink_${i.pledgeId.slice(0, 6)}`, shortUrl: `https://rzp.io/i/${i.pledgeId.slice(0, 6)}` };
      },
    };
    const { ctx, advance } = await commitCtx({ razorpay });
    const drop = await makeDrop(ctx, { tiers: HOODIE, retailCents: 129900 });
    await join(ctx, drop.slug, 3);
    advance(73 * H);
    expect((await settleDrop(ctx, drop.id)).result).toBe("succeeded");
    const rows = await ctx.db.select().from(pledges).where(eq(pledges.dropId, drop.id));
    expect(rows.filter((p) => p.payUrl?.startsWith("https://rzp.io/"))).toHaveLength(2);
    expect(rows.filter((p) => p.payUrl === null)).toHaveLength(1);
    expect(rows.every((p) => p.status === "awaiting_payment")).toBe(true);
  });
});

describe("practice drops and sizes", () => {
  it("practice drops never create a real hold, whatever the server is configured for", async () => {
    const stripe = fakeStripe({ autoConfirm: true });
    const { ctx, advance } = await makeCtx(stripe);
    const drop = await makeDrop(ctx, { practice: true });
    const [m] = await join(ctx, drop.slug, 3);
    expect(stripe.holds.size).toBe(0);
    const [p] = await ctx.db.select().from(pledges).where(eq(pledges.id, m!.pledgeId));
    expect(p!.provider).toBe("demo");

    advance(73 * H);
    expect((await settleDrop(ctx, drop.id)).result).toBe("succeeded");
    const rows = await ctx.db.select().from(pledges).where(eq(pledges.dropId, drop.id));
    expect(rows.every((r) => r.status === "charged")).toBe(true);
  });

  it("asks for a size when the drop has sizes, and records it", async () => {
    const { ctx } = await commitCtx();
    const drop = await makeDrop(ctx, { sizes: ["S", "M", "L"] });
    const u = await makeUser(ctx);
    await expect(joinDrop(ctx, u, drop.slug)).rejects.toThrow(/Pick your size/);
    await expect(joinDrop(ctx, u, drop.slug, { size: "XXXL" })).rejects.toThrow(/Pick your size/);
    const r = await joinDrop(ctx, u, drop.slug, { size: "M" });
    const [p] = await ctx.db.select().from(pledges).where(eq(pledges.id, r.pledgeId));
    expect(p!.size).toBe("M");
  });

  it("leaving a pay-after-close drop says there's nothing to refund", async () => {
    const { ctx, mailer } = await commitCtx();
    const drop = await makeDrop(ctx);
    const u = await makeUser(ctx);
    const r = await joinDrop(ctx, u, drop.slug);
    const { after } = await leavePledge(ctx, u, r.pledgeId);
    for (const t of after) await t();
    expect(mailer.outbox.find((m) => m.kind === "released")!.text).toMatch(/never any money held/);
  });

  it("never emails simulated members", async () => {
    const { ctx, mailer } = await commitCtx();
    const { deliver } = await import("@/lib/email");
    await deliver(ctx, mails.unpaid(ctx, "member-0001@demo.quorum.invalid", { brand: "B", item: "I", slug: "s" }));
    expect(mailer.outbox).toHaveLength(0);
  });
});

describe("margin guard", () => {
  it("passes a ladder aligned to factory price breaks", () => {
    expect(validateTiers(HOODIE.map((t) => ({ ...t, min: t.min * 5 })), 129900, 25, { kind: "house", hostShareBps: 500 })).toEqual([]);
  });

  it("catches a mid tier priced at bulk rates but made at small-batch cost", () => {
    const tee = [
      { min: 15, priceCents: 59900, costCents: 41500 },
      { min: 30, priceCents: 49900, costCents: 41500 },
      { min: 60, priceCents: 44900, costCents: 36500 },
    ];
    const errs = validateTiers(tee, 79900, 25, { kind: "house", hostShareBps: 500 });
    expect(errs.some((e) => e.startsWith("Tier 2:") && /margin/.test(e))).toBe(true);
    expect(tierMargins(tee, 500)[1]!.marginBps).toBeLessThan(500);
  });

  it("requires a unit cost on house drops, but not on partner drops", () => {
    const tiers = [{ min: 10, priceCents: 4100 }, { min: 60, priceCents: 3300 }];
    expect(validateTiers(tiers, 5800, 25, { kind: "house" }).join()).toMatch(/unit cost/);
    expect(validateTiers(tiers, 5800, 25, { kind: "partner" })).toEqual([]);
  });

  it("computes house-drop economics from the tier the drop reached", () => {
    const e = economics({ kind: "house", feeBps: 0, hostShareBps: 500, tiers: HOODIE, unlockedTier: 1 }, 10 * 89900, 10);
    if (e.kind !== "house") throw new Error("expected house economics");
    expect(e.cost).toBe(10 * 59000);
    expect(e.net).toBe(e.volume - e.gst - e.gateway - e.host - e.cost);
    expect(e.perUnit).toBeGreaterThan(15000);
  });
});

describe("razorpay + upi helpers", () => {
  it("verifies webhook signatures and reads the paid pledge", () => {
    const body = JSON.stringify({ event: "payment_link.paid", payload: { payment_link: { entity: { reference_id: "pl_1", status: "paid" } } } });
    const sig = createHmac("sha256", "whsec").update(body).digest("hex");
    expect(verifyRazorpaySignature(body, sig, "whsec")).toBe(true);
    expect(verifyRazorpaySignature(body, sig, "other")).toBe(false);
    expect(verifyRazorpaySignature(body, null, "whsec")).toBe(false);
    expect(paidPledgeId(JSON.parse(body))).toBe("pl_1");
    expect(paidPledgeId({ event: "payment.captured" })).toBeNull();
  });

  it("creates payment links with the final amount and the pledge as reference", async () => {
    let sent: { url: string; body: Record<string, unknown>; auth: string } | null = null;
    const fakeFetch = (async (url: string, init: RequestInit) => {
      sent = { url, body: JSON.parse(String(init.body)), auth: String((init.headers as Record<string, string>).Authorization) };
      return new Response(JSON.stringify({ id: "plink_1", short_url: "https://rzp.io/i/abc" }), { status: 200 });
    }) as unknown as typeof fetch;
    const link = await razorpayClient("rzp_test_key", "secret", fakeFetch).createPaymentLink({
      amountCents: 89900, currency: "inr", pledgeId: "pledge-1", description: "Hoodie", email: "a@b.in", expireBy: new Date("2026-12-01T00:00:00Z"), callbackUrl: "https://q.in/me",
    });
    expect(link).toEqual({ id: "plink_1", shortUrl: "https://rzp.io/i/abc" });
    expect(sent!.url).toBe("https://api.razorpay.com/v1/payment_links");
    expect(sent!.body).toMatchObject({ amount: 89900, currency: "INR", reference_id: "pledge-1", accept_partial: false });
    expect(sent!.auth).toBe(`Basic ${Buffer.from("rzp_test_key:secret").toString("base64")}`);
  });

  it("builds a UPI link a phone can open", () => {
    expect(upiLink({ vpa: "a@okaxis", payee: "Q Store", amountCents: 54900, note: "QRM-ABC123" })).toBe(
      "upi://pay?pa=a%40okaxis&pn=Q%20Store&am=549.00&cu=INR&tn=QRM-ABC123",
    );
    expect(payRef("7f3a9c12-0000-0000-0000-000000000000")).toBe("QRM-7F3A9C");
  });
});
