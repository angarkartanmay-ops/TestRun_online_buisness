/** Product rules from docs/VALIDATION.md. Pure data — safe on client and server. */
export const rules = {
  /** Card authorisations last 7 days; leave a day to settle. */
  maxWindowHours: 144,
  defaultWindowHours: 72,
  /** First tier must be reachable by one group chat. */
  maxFirstTierMembers: 25,
  /** You can leave freely before quorum, or within this window after joining. */
  leaveGraceMinutes: 60,
  /** QUORUM's fee and the host's share of it, in basis points of cleared volume. */
  feeBps: 800,
  hostShareBps: 300,
};
