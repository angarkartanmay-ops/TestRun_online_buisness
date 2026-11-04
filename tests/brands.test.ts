import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { approveBrandApplication, brandDemand, brandForUser, brandReply, demandReport } from "@/lib/brands";
import { brandApplications } from "@/lib/db/schema";
import { createWant, getWant, listWants, toggleVote } from "@/lib/wants";
import { makeCtx, makeUser } from "./support/harness";

async function apply(ctx: Awaited<ReturnType<typeof makeCtx>>["ctx"], over: Partial<typeof brandApplications.$inferInsert> = {}) {
  const [a] = await ctx.db.insert(brandApplications).values({ email: "founder@nikeish.in", brand: "Nike", item: "Tee", factory: "Tiruppur", ...over }).returning();
  return a!;
}

describe("brand accounts", () => {
  it("approval creates the brand and its owner login", async () => {
    const { ctx } = await makeCtx();
    const app = await apply(ctx);
    const r = await approveBrandApplication(ctx, app.id);
    expect(r.ok).toBe(true);
    const brand = (r as { ok: true; brand: { ownerUserId: string; slug: string } }).brand;
    expect(brand.slug).toBe("nike");
    expect(await brandForUser(ctx, brand.ownerUserId)).toMatchObject({ name: "Nike" });
    const [row] = await ctx.db.select().from(brandApplications).where(eq(brandApplications.id, app.id));
    expect(row!.status).toBe("approved");
  });

  it("links to the signed-in applicant and refuses a second brand for one account", async () => {
    const { ctx } = await makeCtx();
    const u = await makeUser(ctx);
    expect((await approveBrandApplication(ctx, (await apply(ctx, { userId: u.id })).id)).ok).toBe(true);
    expect(await brandForUser(ctx, u.id)).not.toBeNull();
    expect((await approveBrandApplication(ctx, (await apply(ctx, { userId: u.id, brand: "Puma" })).id)).ok).toBe(false);
  });

  it("gives clashing brand names distinct slugs", async () => {
    const { ctx } = await makeCtx();
    const a = await approveBrandApplication(ctx, (await apply(ctx)).id);
    const b = await approveBrandApplication(ctx, (await apply(ctx, { email: "other@x.in" })).id);
    expect((a as { brand: { slug: string } }).brand.slug).not.toBe((b as { brand: { slug: string } }).brand.slug);
  });

  it("shows a brand only the requests that name it, and lets it reply", async () => {
    const { ctx } = await makeCtx();
    const buyer = await makeUser(ctx);
    const nikeWant = (await createWant(ctx, buyer, { brand: "NIKE", item: "Pegasus", maxPrice: 6000 })) as { ok: true; want: { id: string; slug: string } };
    await createWant(ctx, buyer, { brand: "Adidas", item: "Samba" });
    const { brand } = (await approveBrandApplication(ctx, (await apply(ctx)).id)) as { ok: true; brand: Parameters<typeof brandReply>[1] };
    const seen = await brandDemand(ctx, brand.name);
    expect(seen.map((w) => w.item)).toEqual(["Pegasus"]);
    expect(await brandReply(ctx, brand, nikeWant.want.id, "Coming to Bengaluru in March.")).toBe(true);
    expect(await getWant(ctx, nikeWant.want.slug)).toMatchObject({ status: "answered", answer: "Coming to Bengaluru in March." });
    const adidas = (await listWants(ctx)).find((w) => w.brand === "Adidas")!;
    expect(await brandReply(ctx, brand, adidas.id, "nope")).toBe(false);
  });

  it("builds a report whose numbers match the votes", async () => {
    const { ctx } = await makeCtx();
    const [a, b] = [await makeUser(ctx), await makeUser(ctx)];
    const w = (await createWant(ctx, a, { brand: "Nike", item: "Pegasus", maxPrice: 4000 })) as { ok: true; want: { id: string } };
    await toggleVote(ctx, b, w.want.id, { maxPrice: 6000, city: "Mysuru" });
    await createWant(ctx, a, { brand: "Adidas", item: "Samba" });
    const r = await demandReport(ctx, "nike");
    expect(r.totalVotes).toBe(2);
    expect(r.requests).toHaveLength(1);
    expect(r.requests[0]!.medianPriceCents).toBe(500000);
    expect(r.byCity).toEqual([{ city: "Bengaluru", n: 1 }, { city: "Mysuru", n: 1 }]);
  });
});
