import { eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createPglite } from "@/lib/db/pglite";
import { drops } from "@/lib/db/schema";
import { listDrops } from "@/lib/drops";
import { clearDemo, refreshPracticeDrops, seedDemo } from "@/lib/seed";
import { validateTiers } from "@/lib/tiers";
import { rules } from "@/lib/rules";

const D = 86400_000;

describe("practice drops", () => {
  it("seed an Indian campus catalogue that obeys the product's own rules, margin guard included", async () => {
    const db = await createPglite();
    await seedDemo(db);
    const live = await listDrops(db, ["live"]);
    expect(live.length).toBe(4);
    for (const d of live) {
      expect(d.practice).toBe(true);
      expect(d.kind).toBe("house");
      expect(validateTiers(d.tiers, d.retailCents, rules.maxFirstTierMembers, { kind: d.kind, hostShareBps: d.hostShareBps })).toEqual([]);
      const windowH = (d.closesAt.getTime() - d.opensAt.getTime()) / 3600_000;
      expect(windowH).toBeLessThanOrEqual(rules.maxWindowHours);
    }
    const hoodie = live.find((d) => d.slug === "batch-27-hoodie")!;
    expect(hoodie.members).toBe(38);
    expect(hoodie.ladder.priceCents).toBe(104900);
    expect(hoodie.sizes).toContain("M");

    const cleared = (await listDrops(db, ["succeeded"]))[0]!;
    expect(cleared.receipt.reduce((s, l) => s + l.cents, 0)).toBe(cleared.finalPriceCents);

    await clearDemo(db);
    expect(await listDrops(db, ["live", "succeeded", "failed"])).toHaveLength(0);
  });

  it("refresh opens a new batch when the board runs low, and tidies old ones", async () => {
    const db = await createPglite();
    const start = new Date("2026-11-01T12:00:00Z");
    await seedDemo(db, start);

    // Nothing to do while four are open.
    expect(await refreshPracticeDrops(db, start)).toEqual({ created: 0, removed: 0 });

    // Six days on, every seeded live drop has closed: a fresh batch opens.
    const later = new Date(start.getTime() + 6 * D);
    await db.update(drops).set({ status: "succeeded" }).where(eq(drops.status, "live"));
    const r = await refreshPracticeDrops(db, later);
    expect(r.created).toBe(4);
    const open = await listDrops(db, ["live"]);
    expect(open).toHaveLength(4);
    expect(open.every((d) => d.slug.endsWith("-26110712"))).toBe(true);

    // Running it again in the same hour can't double up.
    expect((await refreshPracticeDrops(db, later)).created).toBe(0);

    // A month on, old closed drops are deleted — except the newest cleared and missed
    // examples, and the newest with a published receipt (the homepage shows it).
    const muchLater = new Date(start.getTime() + 40 * D);
    await db.update(drops).set({ status: "succeeded" }).where(eq(drops.status, "live"));
    const tidy = await refreshPracticeDrops(db, muchLater);
    expect(tidy.removed).toBeGreaterThan(0);
    expect((await listDrops(db, ["failed"])).length).toBe(1);
    const cleared = await listDrops(db, ["succeeded"]);
    expect(cleared.length).toBe(2);
    expect(cleared.some((d) => d.receipt.length > 0)).toBe(true);
  });

  it("restores the closed examples on a database that wasn't empty at first boot", async () => {
    const db = await createPglite();
    const now = new Date("2026-11-01T17:00:00Z");
    // Production's state after the first restock: live practice drops, no closed examples.
    await refreshPracticeDrops(db, now);
    await db.delete(drops).where(inArray(drops.status, ["succeeded", "failed"]));
    expect(await listDrops(db, ["succeeded", "failed"])).toHaveLength(0);

    const r = await refreshPracticeDrops(db, now);
    expect(r.created).toBe(2);
    const [receipt] = await listDrops(db, ["succeeded"]);
    expect(receipt!.receipt.reduce((s, l) => s + l.cents, 0)).toBe(receipt!.finalPriceCents);
    expect(await listDrops(db, ["failed"])).toHaveLength(1);
    expect((await refreshPracticeDrops(db, now)).created).toBe(0);
  });

  it("retires the old sample catalogue unless a real member joined it", async () => {
    const db = await createPglite();
    await db.insert(drops).values({
      slug: "wet-cement-loopback-tee", brand: "Wet Cement", item: "Tee", category: "apparel", retailCents: 5800,
      tiers: [{ min: 10, priceCents: 4100 }, { min: 60, priceCents: 3300 }], status: "live",
      opensAt: new Date(), closesAt: new Date(Date.now() + D), shipBy: new Date(Date.now() + 30 * D), origin: "Barcelos, PT",
    });
    const r = await refreshPracticeDrops(db);
    expect(r.removed).toBe(1);
    expect((await listDrops(db, ["live"])).every((d) => d.practice)).toBe(true);
  });
});
