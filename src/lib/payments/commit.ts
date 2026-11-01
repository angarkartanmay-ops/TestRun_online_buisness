import { randomUUID } from "node:crypto";
import type { Payments } from "./types";

/**
 * Pay after close. Joining records a promise — no money is held anywhere, so
 * nothing ever needs releasing or refunding when a drop misses quorum. When a
 * drop clears, settlement asks each member for the final price (a UPI link or a
 * Razorpay payment link) and marks the pledge `awaiting_payment` until it's paid.
 */
export const commitPayments: Payments = {
  mode: "commit",
  async createHold() {
    return { ref: `commit_${randomUUID()}`, clientSecret: null, status: "held" };
  },
  async resumeHold() {
    return { clientSecret: null, status: "held" };
  },
  async getStatus() {
    return "held";
  },
  async capture() {},
  async release() {},
  // Money paid by UPI is returned by UPI, by a person. The admin marks it refunded.
  async refund() {},
};
