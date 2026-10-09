import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { drops, payouts, pledges, users } from "@/lib/db/schema";
import { DropError, getDrop, memberCount } from "@/lib/drops";
import { confirmPledge, joinDrop, leavePledge } from "@/lib/pledges";
import { cancelDrop, settleDrop, settleDue } from "@/lib/settle";
import { fakeStripe, makeCtx, makeDrop, makeUser } from "./support/harness";

const H = 3600_000;

async function joinN(ctx: Awaited<ReturnType<typeof makeCtx>>["ctx"], slug: string, n: number, referrerCode?: string) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const u = await makeUser(ctx);
    const r = await joinDrop(ctx, u, slug, { referrerCode });
    for (const t of r.after) await t();
    out.push({ user: u, result: r });
  }
  return out;
}

describe("joining a drop", () => {
  it("holds the opening price below quorum, and the unlocked price after", async () => {
    const { ctx } = await makeCtx();
    const drop = await makeDrop(ctx);
    const first = await joinN(ctx, drop.slug, 3);
    expect(first[0]!.result.holdCents).toBe(4100);
    expect((await getDrop(ctx.db, drop.id))!.unlockedTier).toBe(0);

    const [fourth] = await joinN(ctx, drop.slug, 1);
    expect(fourth!.result.holdCents).toBe(4100); // tier 1 price, unlocked by the first three
    await joinN(ctx, drop.slug, 1);
    const [sixth] = await joinN(ctx, drop.slug, 1);
    expect(sixth!.result.holdCents).toBe(3300);
  });

  it("returns the same pledge on a double join instead of a second hold", async () => {
    const { ctx } = await makeCtx();
    const drop = await makeDrop(ctx);
    const u = await makeUser(ctx);
    const a = await joinDrop(ctx, u, drop.slug);
    const b = await joinDrop(ctx, u, drop.slug);
    expect(b.pledgeId).toBe(a.pledgeId);
    expect(b.alreadyIn).toBe(true);
    expect(await memberCount(ctx.db, drop.id)).toBe(1);
  });

  it("doesn't count a member until the card hold is confirmed", async () => {
    const stripe = fakeStripe({ autoConfirm: false });
    const { ctx } = await makeCtx(stripe);
    const drop = await makeDrop(ctx);
    const u = await makeUser(ctx);
    const r = await joinDrop(ctx, u, drop.slug);
    expect(r.status).toBe("requires_confirmation");
    expect(r.clientSecret).toBeTruthy();
    expect(await memberCount(ctx.db, drop.id)).toBe(0);

    const [p] = await ctx.db.select().from(pledges).where(eq(pledges.id, r.pledgeId));
    stripe.confirm(p!.providerRef!);
    const c = await confirmPledge(ctx, u, r.pledgeId);
    expect(c.status).toBe("held");
    expect(await memberCount(ctx.db, drop.id)).toBe(1);
    // confirming twice (browser + webhook) is harmless
    await confirmPledge(ctx, u, r.pledgeId);
    expect(await memberCount(ctx.db, drop.id)).toBe(1);
  });

  it("refuses closed and unpublished drops", async () => {
    const { ctx } = await makeCtx();
    const u = await makeUser(ctx);
    const closed = await makeDrop(ctx, { closesAt: new Date(ctx.now().getTime() - 1000) });
    await expect(joinDrop(ctx, u, closed.slug)).rejects.toMatchObject({ code: "closed" });
    const draft = await makeDrop(ctx, { status: "draft" });
    await expect(joinDrop(ctx, u, draft.slug)).rejects.toBeInstanceOf(DropError);
  });

  it("credits the crew link, but not your own", async () => {
    const { ctx } = await makeCtx();
    const drop = await makeDrop(ctx);
    const friend = await makeUser(ctx);
    const [joined] = await joinN(ctx, drop.slug, 1, friend.crewCode);
    const [p] = await ctx.db.select().from(pledges).where(eq(pledges.id, joined!.result.pledgeId));
    expect(p!.referrerId).toBe(friend.id);

    const self = await joinDrop(ctx, friend, drop.slug, { referrerCode: friend.crewCode });
    const [own] = await ctx.db.select().from(pledges).where(eq(pledges.id, self.pledgeId));
    expect(own!.referrerId).toBeNull();
  });
});

describe("the ratchet", () => {
  it("keeps an unlocked tier unlocked when members leave in their grace window", async () => {
    const { ctx } = await makeCtx();
    const drop = await makeDrop(ctx);
    const members = await joinN(ctx, drop.slug, 5);
    expect((await getDrop(ctx.db, drop.id))!.unlockedTier).toBe(1);

    await leavePledge(ctx, members[4]!.user, members[4]!.result.pledgeId);
    expect(await memberCount(ctx.db, drop.id)).toBe(4);
    expect((await getDrop(ctx.db, drop.id))!.unlockedTier).toBe(1); // still $33
  });

  it("locks members in after quorum once the grace window passes", async () => {
    const { ctx, advance } = await makeCtx();
    const drop = await makeDrop(ctx);
    const members = await joinN(ctx, drop.slug, 3);
    advance(2 * H);
    await expect(leavePledge(ctx, members[0]!.user, members[0]!.result.pledgeId)).rejects.toMatchObject({ code: "cannot_leave" });
  });

  it("lets anyone leave before quorum", async () => {
    const { ctx, advance } = await makeCtx();
    const drop = await makeDrop(ctx);
    const members = await joinN(ctx, drop.slug, 2);
    advance(5 * H);
    await leavePledge(ctx, members[0]!.user, members[0]!.result.pledgeId);
    expect(await memberCount(ctx.db, drop.id)).toBe(1);
  });
});

describe("settlement", () => {
  it("captures everyone at the final tier — including members held at higher prices", async () => {
    const stripe = fakeStripe({ autoConfirm: true });
    const { ctx, mailer, advance } = await makeCtx(stripe);
    const drop = await makeDrop(ctx);
    await joinN(ctx, drop.slug, 8);
    advance(73 * H);

    const out = await settleDrop(ctx, drop.id);
    expect(out).toMatchObject({ result: "succeeded", finalPriceCents: 2300, charged: 8 });
    const captured = [...stripe.holds.values()].map((h) => h.captured);
    expect(captured).toEqual(Array(8).fill(2300));
    const holds = [...stripe.holds.values()].map((h) => h.amount);
    expect(holds.filter((a) => a === 4100).length).toBeGreaterThan(0); // early joiners held higher, charged the floor
    expect(mailer.outbox.filter((m) => m.kind === "charged")).toHaveLength(8);
    expect((await getDrop(ctx.db, drop.id))!.status).toBe("succeeded");
  });

  it("releases every hold when quorum is missed, and charges no one", async () => {
    const stripe = fakeStripe({ autoConfirm: true });
    const { ctx, mailer, advance } = await makeCtx(stripe);
    const drop = await makeDrop(ctx);
    await joinN(ctx, drop.slug, 2);
    advance(73 * H);
    expect(await settleDrop(ctx, drop.id)).toMatchObject({ result: "failed", released: 2 });
    expect([...stripe.holds.values()].every((h) => h.status === "canceled")).toBe(true);
    expect(mailer.outbox.filter((m) => m.kind === "released")).toHaveLength(2);
  });

  it("does nothing before the deadline and nothing twice", async () => {
    const { ctx, advance } = await makeCtx();
    const drop = await makeDrop(ctx);
    await joinN(ctx, drop.slug, 3);
    expect((await settleDrop(ctx, drop.id)).result).toBe("skipped");
    advance(73 * H);
    expect((await settleDrop(ctx, drop.id)).result).toBe("succeeded");
    expect((await settleDrop(ctx, drop.id)).result).toBe("skipped");
  });

  it("survives a failed capture and finishes on the next run without double-charging", async () => {
    const stripe = fakeStripe({ autoConfirm: true });
    const { ctx, advance } = await makeCtx(stripe);
    const drop = await makeDrop(ctx);
    await joinN(ctx, drop.slug, 4);
    advance(73 * H);
    stripe.failCaptures(2);
    expect(await settleDrop(ctx, drop.id)).toMatchObject({ result: "incomplete", remaining: 2 });
    expect((await getDrop(ctx.db, drop.id))!.status).toBe("settling");

    expect(await settleDrop(ctx, drop.id)).toMatchObject({ result: "succeeded", charged: 4 });
    expect([...stripe.holds.values()].filter((h) => h.status === "captured")).toHaveLength(4);
  });

  it("marks an expired hold failed instead of looping on it", async () => {
    const stripe = fakeStripe({ autoConfirm: true });
    const { ctx, advance } = await makeCtx(stripe);
    const drop = await makeDrop(ctx);
    await joinN(ctx, drop.slug, 4);
    const [p] = await ctx.db.select().from(pledges).where(eq(pledges.dropId, drop.id)).limit(1);
    stripe.expire(p!.providerRef!);
    advance(73 * H);
    expect(await settleDrop(ctx, drop.id)).toMatchObject({ result: "succeeded", charged: 3 });
  });

  it("cancels unconfirmed holds at close rather than counting them", async () => {
    const stripe = fakeStripe({ autoConfirm: false });
    const { ctx, advance } = await makeCtx(stripe);
    const drop = await makeDrop(ctx);
    const u = await makeUser(ctx);
    await joinDrop(ctx, u, drop.slug);
    advance(73 * H);
    await settleDrop(ctx, drop.id);
    const [p] = await ctx.db.select().from(pledges).where(eq(pledges.userId, u.id));
    expect(p!.status).toBe("released");
    expect(p!.releaseReason).toBe("never_confirmed");
  });

  it("pays approved hosts 3% of the volume their crew link brought", async () => {
    const { ctx, advance } = await makeCtx();
    const drop = await makeDrop(ctx);
    const host = await makeUser(ctx);
    await ctx.db.update(users).set({ hostStatus: "approved" }).where(eq(users.id, host.id));
    const notHost = await makeUser(ctx);
    await joinN(ctx, drop.slug, 5, host.crewCode);
    await joinN(ctx, drop.slug, 3, notHost.crewCode);
    advance(73 * H);
    await settleDrop(ctx, drop.id);
    const rows = await ctx.db.select().from(payouts);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ hostUserId: host.id, members: 5, volumeCents: 5 * 2300, amountCents: 345 });
  });

  it("settles every overdue drop in one sweep", async () => {
    const { ctx, advance } = await makeCtx();
    const a = await makeDrop(ctx);
    const b = await makeDrop(ctx, { closesAt: new Date(ctx.now().getTime() + 10 * 24 * H) });
    await joinN(ctx, a.slug, 3);
    advance(73 * H);
    const out = await settleDue(ctx);
    expect(out.map((o) => o.dropId)).toEqual([a.id]);
    expect((await getDrop(ctx.db, b.id))!.status).toBe("live");
  });

  it("lets an admin cancel a live drop and releases everyone", async () => {
    const stripe = fakeStripe({ autoConfirm: true });
    const { ctx } = await makeCtx(stripe);
    const drop = await makeDrop(ctx);
    await joinN(ctx, drop.slug, 4);
    expect(await cancelDrop(ctx, drop.id)).toMatchObject({ result: "failed", released: 4 });
    const [d] = await ctx.db.select().from(drops).where(eq(drops.id, drop.id));
    expect(d!.status).toBe("canceled");
  });
});

describe("bylaw 5: ship by the date or refund", () => {
  it("flags a cleared drop past its ship-by date and refunds everyone in full", async () => {
    const stripe = fakeStripe({ autoConfirm: true });
    const { ctx, advance } = await makeCtx(stripe);
    const { overdueDrops, refundDrop, markShipped } = await import("@/lib/settle");
    const drop = await makeDrop(ctx);
    await joinN(ctx, drop.slug, 3);
    advance(73 * H);
    await settleDrop(ctx, drop.id);
    expect(await overdueDrops(ctx)).toHaveLength(0);

    advance(41 * 24 * H);
    expect((await overdueDrops(ctx)).map((d) => d.id)).toEqual([drop.id]);
    expect(await refundDrop(ctx, drop.id)).toEqual({ refunded: 3, failed: 0 });
    expect(await refundDrop(ctx, drop.id)).toEqual({ refunded: 0, failed: 0 });

    const other = await makeDrop(ctx, { slug: "shipped-one" });
    await joinN(ctx, other.slug, 3);
    advance(73 * H);
    await settleDrop(ctx, other.id);
    advance(41 * 24 * H);
    await markShipped(ctx, other.id);
    expect((await overdueDrops(ctx)).map((d) => d.id)).not.toContain(other.id);
  });
});
