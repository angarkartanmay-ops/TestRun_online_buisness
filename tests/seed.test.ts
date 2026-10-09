import { describe, expect, it } from "vitest";
import { createPglite } from "@/lib/db/pglite";
import { listDrops } from "@/lib/drops";
import { clearDemo, seedDemo } from "@/lib/seed";
import { validateTiers } from "@/lib/tiers";
import { rules } from "@/lib/rules";

describe("sample data", () => {
  it("seeds drops that obey the product's own rules, and clears cleanly", async () => {
    const db = await createPglite();
    await seedDemo(db);
    const live = await listDrops(db, ["live"]);
    expect(live.length).toBe(8);
    for (const d of live) {
      expect(validateTiers(d.tiers, d.retailCents, rules.maxFirstTierMembers)).toEqual([]);
      const windowH = (d.closesAt.getTime() - d.opensAt.getTime()) / 3600_000;
      expect(windowH).toBeLessThanOrEqual(rules.maxWindowHours);
    }
    const tee = live.find((d) => d.slug === "wet-cement-loopback-tee")!;
    expect(tee.members).toBe(287);
    expect(tee.ladder.priceCents).toBe(2700);

    const receipts = (await listDrops(db, ["succeeded"]))[0]!;
    expect(receipts.receipt.reduce((s, l) => s + l.cents, 0)).toBe(receipts.finalPriceCents);

    await clearDemo(db);
    expect(await listDrops(db, ["live", "succeeded", "failed"])).toHaveLength(0);
  });
});
