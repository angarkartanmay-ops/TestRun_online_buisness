import "server-only";
import { config } from "../config";
import { demoPayments } from "./demo";
import { stripePayments } from "./stripe";
import type { Payments } from "./types";

let cached: Payments | undefined;

export function getPayments(): Payments {
  cached ??= config.stripeSecretKey ? stripePayments(config.stripeSecretKey) : demoPayments;
  return cached;
}

export type { Payments, HoldStatus } from "./types";
export { HoldExpiredError } from "./types";
