import type { DropKind, Tier } from "./db/schema";
import { rules } from "./rules";

/**
 * Pure price-ladder math, shared by the server (what we charge) and the browser
 * (what we display), so the two can never disagree.
 *
 * The ratchet: `unlockedTier` is the highest tier the drop has ever reached. It is
 * stored on the drop and only increases, so if members leave the price does not
 * climb back up. "The price only falls" is enforced here, not promised in copy.
 */

/** Highest tier index whose threshold `members` meets, or -1 below quorum. */
export function tierIndexFor(tiers: readonly Tier[], members: number): number {
  let idx = -1;
  tiers.forEach((t, i) => {
    if (members >= t.min) idx = i;
  });
  return idx;
}

/** The ratchet applied: never lower than what was already unlocked. */
export function ratchet(tiers: readonly Tier[], members: number, unlockedTier: number): number {
  return Math.max(unlockedTier, tierIndexFor(tiers, members));
}

/** Price a new member is authorised at right now: the unlocked tier, or the opening price. */
export function currentPriceCents(tiers: readonly Tier[], unlockedTier: number): number {
  const t = unlockedTier >= 0 ? tiers[unlockedTier] : tiers[0];
  if (!t) throw new Error("Drop has no tiers");
  return t.priceCents;
}

export type LadderState = {
  members: number;
  unlockedTier: number;
  quorumMet: boolean;
  floorReached: boolean;
  /** What everyone pays if the drop closed now. Null below quorum (nobody pays). */
  priceCents: number | null;
  /** What a new member is held at. */
  holdCents: number;
  next: { index: number; min: number; priceCents: number; needed: number } | null;
  /** 0–100, progress from zero to the floor tier, for the ladder fill. */
  progress: number;
};

export function ladderState(tiers: readonly Tier[], members: number, unlockedTier: number): LadderState {
  const unlocked = ratchet(tiers, members, unlockedTier);
  const floor = tiers[tiers.length - 1]!;
  const nextTier = tiers[unlocked + 1];
  return {
    members,
    unlockedTier: unlocked,
    quorumMet: unlocked >= 0,
    floorReached: unlocked === tiers.length - 1,
    priceCents: unlocked >= 0 ? tiers[unlocked]!.priceCents : null,
    holdCents: currentPriceCents(tiers, unlocked),
    next: nextTier
      ? {
          index: unlocked + 1,
          min: nextTier.min,
          priceCents: nextTier.priceCents,
          needed: Math.max(0, nextTier.min - members),
        }
      : null,
    progress: Math.min(100, Math.round((Math.max(members, unlocked >= 0 ? tiers[unlocked]!.min : 0) / floor.min) * 1000) / 10),
  };
}

export type TierMargin = { index: number; exTaxCents: number; netCents: number; marginBps: number };

/**
 * House-drop margin per tier: the GST-inclusive price, less GST, the gateway fee,
 * the club fund's share and the unit cost at that tier's quantity. This is what
 * keeps a ladder from being priced below what it costs to make — the trap where a
 * mid tier is priced at bulk rates but still produced at small-batch cost.
 */
export function tierMargins(tiers: readonly Tier[], hostShareBps: number): TierMargin[] {
  return tiers.map((t, index) => {
    const exTax = Math.round((t.priceCents * 10_000) / (10_000 + rules.gstBps));
    const fees = Math.round((t.priceCents * (rules.gatewayBps + hostShareBps)) / 10_000);
    const net = exTax - fees - (t.costCents ?? 0);
    return { index, exTaxCents: exTax, netCents: net, marginBps: exTax > 0 ? Math.round((net * 10_000) / exTax) : 0 };
  });
}

/** Problems with a ladder, phrased for the person fixing it. Empty array = valid. */
export function validateTiers(
  tiers: readonly Tier[],
  retailCents: number,
  maxFirstTier: number,
  opts: { kind?: DropKind; hostShareBps?: number } = {},
): string[] {
  const errors: string[] = [];
  if (tiers.length < 2) errors.push("Add at least two tiers — one tier is just a price.");
  if (tiers.length > 6) errors.push("Keep it to six tiers or fewer; nobody reads a longer ladder.");
  tiers.forEach((t, i) => {
    if (!Number.isInteger(t.min) || t.min < 2) errors.push(`Tier ${i + 1}: needs at least 2 members.`);
    if (!Number.isInteger(t.priceCents) || t.priceCents <= 0) errors.push(`Tier ${i + 1}: price must be above zero.`);
    const prev = tiers[i - 1];
    if (prev) {
      if (t.min <= prev.min) errors.push(`Tier ${i + 1}: must need more members than tier ${i}.`);
      if (t.priceCents >= prev.priceCents) errors.push(`Tier ${i + 1}: must be cheaper than tier ${i}.`);
    }
  });
  const first = tiers[0];
  if (first && first.min > maxFirstTier) {
    errors.push(`Tier 1 needs ${first.min} members. Keep it at ${maxFirstTier} or fewer — one group chat should be able to open a drop.`);
  }
  if (first && first.priceCents >= retailCents) {
    errors.push("Tier 1 must already beat the retail price, or there's no reason to join.");
  }
  if (opts.kind === "house") {
    const missing = tiers.findIndex((t) => !Number.isInteger(t.costCents) || (t.costCents ?? 0) <= 0);
    if (missing >= 0) {
      errors.push(`Tier ${missing + 1}: enter the unit cost at that quantity (making + delivery). House drops can't be priced without it.`);
    } else {
      const min = rules.minMarginBps;
      for (const m of tierMargins(tiers, opts.hostShareBps ?? rules.houseHostShareBps)) {
        if (m.marginBps < min) {
          errors.push(
            `Tier ${m.index + 1}: only ${(m.marginBps / 100).toFixed(1)}% margin after GST, gateway, club fund and cost — keep at least ${min / 100}%. Raise the price, or move the tier to where the factory price drops.`,
          );
        }
      }
    }
  }
  return errors;
}

/**
 * Fill for a ladder drawn as equal-width columns, one per tier. Each column is a
 * segment from the previous threshold to its own, so the fill crosses a stop at
 * exactly the member count that unlocks it. Returns 0–1.
 */
export function ladderFill(tiers: readonly Tier[], members: number, unlockedTier: number): number {
  const n = tiers.length;
  if (n === 0) return 0;
  const m = Math.max(members, unlockedTier >= 0 ? tiers[unlockedTier]!.min : 0);
  for (let k = 0; k < n; k++) {
    const hi = tiers[k]!.min;
    if (m < hi) {
      const lo = k === 0 ? 0 : tiers[k - 1]!.min;
      return (k + (m - lo) / (hi - lo)) / n;
    }
  }
  return 1;
}
