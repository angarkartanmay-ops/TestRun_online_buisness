import { describe, expect, it } from "vitest";
import { currentPriceCents, ladderState, ratchet, tierIndexFor, validateTiers } from "@/lib/tiers";
import { bps, money } from "@/lib/money";

const tiers = [
  { min: 10, priceCents: 4100 },
  { min: 60, priceCents: 3300 },
  { min: 180, priceCents: 2700 },
  { min: 400, priceCents: 2300 },
];

describe("tier math", () => {
  it("finds the highest tier the member count reaches", () => {
    expect(tierIndexFor(tiers, 0)).toBe(-1);
    expect(tierIndexFor(tiers, 9)).toBe(-1);
    expect(tierIndexFor(tiers, 10)).toBe(0);
    expect(tierIndexFor(tiers, 287)).toBe(2);
    expect(tierIndexFor(tiers, 400)).toBe(3);
    expect(tierIndexFor(tiers, 9000)).toBe(3);
  });

  it("never lets the ratchet go backwards when members leave", () => {
    expect(ratchet(tiers, 50, 2)).toBe(2);
    expect(ratchet(tiers, 200, 1)).toBe(2);
  });

  it("holds new members at the opening price below quorum, then at the unlocked price", () => {
    expect(currentPriceCents(tiers, -1)).toBe(4100);
    expect(currentPriceCents(tiers, 2)).toBe(2700);
  });

  it("describes the ladder the way the page shows it", () => {
    const s = ladderState(tiers, 287, 2);
    expect(s.priceCents).toBe(2700);
    expect(s.next).toEqual({ index: 3, min: 400, priceCents: 2300, needed: 113 });
    expect(s.quorumMet).toBe(true);
    expect(s.floorReached).toBe(false);

    const below = ladderState(tiers, 4, -1);
    expect(below.priceCents).toBeNull();
    expect(below.holdCents).toBe(4100);
    expect(below.next?.needed).toBe(6);

    const floor = ladderState(tiers, 512, 3);
    expect(floor.floorReached).toBe(true);
    expect(floor.next).toBeNull();
    expect(floor.progress).toBe(100);
  });

  it("keeps showing an unlocked tier's price after members leave", () => {
    const s = ladderState(tiers, 170, 2);
    expect(s.priceCents).toBe(2700);
    expect(s.next?.needed).toBe(230);
  });
});

describe("ladder validation", () => {
  it("accepts a sound ladder", () => {
    expect(validateTiers(tiers, 5800, 25)).toEqual([]);
  });
  it("rejects a first tier one group chat can't reach", () => {
    expect(validateTiers([{ min: 100, priceCents: 4000 }, { min: 200, priceCents: 3000 }], 5800, 25).join()).toMatch(/Keep it at 25/);
  });
  it("rejects prices that rise or member counts that fall", () => {
    const errs = validateTiers([{ min: 10, priceCents: 3000 }, { min: 5, priceCents: 3500 }], 5800, 25);
    expect(errs.some((e) => e.includes("more members"))).toBe(true);
    expect(errs.some((e) => e.includes("cheaper"))).toBe(true);
  });
  it("rejects a first tier that doesn't beat retail", () => {
    expect(validateTiers([{ min: 10, priceCents: 6000 }, { min: 50, priceCents: 5000 }], 5800, 25).join()).toMatch(/beat the retail/);
  });
});

describe("money", () => {
  it("formats whole and fractional dollars", () => {
    expect(money(4100)).toBe("$41");
    expect(money(2350)).toBe("$23.50");
    expect(money(123456)).toBe("$1,234.56");
  });
  it("takes basis points", () => {
    expect(bps(2300, 800)).toBe(184);
    expect(bps(1_156_000, 300)).toBe(34_680);
  });
});
