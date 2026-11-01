/** Product rules from docs/VALIDATION.md. Pure data — safe on client and server. */
export const rules = {
  /** Card authorisations last 7 days; leave a day to settle. Pay-after-close drops use the same cap. */
  maxWindowHours: 144,
  defaultWindowHours: 72,
  /** First tier must be reachable by one group chat. */
  maxFirstTierMembers: 25,
  /** You can leave freely before quorum, or within this window after joining. */
  leaveGraceMinutes: 60,
  /** Partner drops: QUORUM's fee and the host's share of it, in basis points of cleared volume. */
  feeBps: 800,
  hostShareBps: 300,
  /** House drops: the club fund's default share of what the drop sells. */
  houseHostShareBps: 500,
  /** Pay-after-close: members have this long after close to pay the final price. */
  payWindowHours: 48,
  /**
   * House-drop margin guard. Prices include GST (5% on garments up to ₹2,500) and
   * the gateway fee (2% + 18% GST); each tier must keep at least this much of its
   * pre-tax price after the unit cost, the gateway and the club fund.
   */
  gstBps: 500,
  gatewayBps: 236,
  minMarginBps: 2000,
};
