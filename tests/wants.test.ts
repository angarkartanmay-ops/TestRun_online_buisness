import { describe, expect, it } from "vitest";
import { makeCtx, makeUser } from "./support/harness";
import { createWant, getWant, listWants, MAX_WANTS_PER_DAY, setWantStatus, toggleVote } from "@/lib/wants";

const base = { brand: "Nike", item: "Pegasus 41", city: "Bengaluru" as const, category: "footwear" as const };

describe("demand signals", () => {
  it("counts the poster's own vote and rejects thin input", async () => {
    const { ctx } = await makeCtx();
    const u = await makeUser(ctx);
    const r = await createWant(ctx, u, { ...base, maxPrice: 6000 });
    expect(r.ok).toBe(true);
    const d = await getWant(ctx, (r as { ok: true; want: { slug: string } }).want.slug, u.id);
    expect(d).toMatchObject({ votes: 1, mine: true, medianPriceCents: 600000, priced: 1 });
    expect((await createWant(ctx, u, { ...base, brand: "N" })).ok).toBe(false);
  });

  it("allows one vote per person and toggles it off", async () => {
    const { ctx } = await makeCtx();
    const [a, b] = [await makeUser(ctx), await makeUser(ctx)];
    const w = (await createWant(ctx, a, base)) as { ok: true; want: { id: string; slug: string } };
    expect(await toggleVote(ctx, b, w.want.id, { maxPrice: 5000 })).toEqual({ ok: true, voted: true });
    expect((await getWant(ctx, w.want.slug))!.votes).toBe(2);
    expect(await toggleVote(ctx, b, w.want.id)).toEqual({ ok: true, voted: false });
    expect((await getWant(ctx, w.want.slug))!.votes).toBe(1);
  });

  it("reports the median price and where the demand is", async () => {
    const { ctx } = await makeCtx();
    const users = [await makeUser(ctx), await makeUser(ctx), await makeUser(ctx)];
    const w = (await createWant(ctx, users[0]!, { ...base, maxPrice: 4000 })) as { ok: true; want: { id: string; slug: string } };
    await toggleVote(ctx, users[1]!, w.want.id, { maxPrice: 6000, city: "Mysuru" });
    await toggleVote(ctx, users[2]!, w.want.id, { maxPrice: 5000 });
    const d = (await getWant(ctx, w.want.slug))!;
    expect(d.votes).toBe(3);
    expect(d.medianPriceCents).toBe(500000);
    expect(d.byCity).toEqual([{ city: "Bengaluru", n: 2 }, { city: "Mysuru", n: 1 }]);
  });

  it("limits new requests per day", async () => {
    const { ctx, advance } = await makeCtx();
    const u = await makeUser(ctx);
    for (let i = 0; i < MAX_WANTS_PER_DAY; i++) expect((await createWant(ctx, u, { ...base, item: `Shoe ${i}` })).ok).toBe(true);
    expect((await createWant(ctx, u, { ...base, item: "One more" })).ok).toBe(false);
    advance(25 * 3600_000);
    expect((await createWant(ctx, u, { ...base, item: "One more" })).ok).toBe(true);
  });

  it("gives duplicate names distinct slugs and ranks by votes", async () => {
    const { ctx } = await makeCtx();
    const [a, b, c] = [await makeUser(ctx), await makeUser(ctx), await makeUser(ctx)];
    const first = (await createWant(ctx, a, base)) as { ok: true; want: { id: string; slug: string } };
    const second = (await createWant(ctx, b, base)) as { ok: true; want: { id: string; slug: string } };
    expect(second.want.slug).not.toBe(first.want.slug);
    await toggleVote(ctx, c, second.want.id);
    expect((await listWants(ctx))[0]!.id).toBe(second.want.id);
  });

  it("hides hidden requests from the public list and from voting", async () => {
    const { ctx } = await makeCtx();
    const [a, b] = [await makeUser(ctx), await makeUser(ctx)];
    const w = (await createWant(ctx, a, base)) as { ok: true; want: { id: string } };
    await setWantStatus(ctx, w.want.id, "hidden");
    expect(await listWants(ctx)).toHaveLength(0);
    expect(await listWants(ctx, { includeHidden: true })).toHaveLength(1);
    expect((await toggleVote(ctx, b, w.want.id)).ok).toBe(false);
  });
});
