import { randomUUID } from "node:crypto";
import type { Payments } from "./types";

/** Simulated holds. Nothing leaves the server; used whenever STRIPE_SECRET_KEY is unset. */
export const demoPayments: Payments = {
  mode: "demo",
  async createHold() {
    return { ref: `demo_${randomUUID()}`, clientSecret: null, status: "held" };
  },
  async resumeHold() {
    return { clientSecret: null, status: "held" };
  },
  async getStatus() {
    return "held";
  },
  async capture() {},
  async release() {},
  async refund() {},
};
