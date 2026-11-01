import "server-only";
import { config, modes } from "../config";
import { commitPayments } from "./commit";
import { demoPayments } from "./demo";
import { razorpayClient, type RazorpayClient } from "./razorpay";
import { stripePayments } from "./stripe";
import type { Payments } from "./types";

let cached: Payments | undefined;

export function getPayments(): Payments {
  cached ??=
    modes.payments === "stripe" ? stripePayments(config.stripeSecretKey!) : modes.payments === "commit" ? commitPayments : demoPayments;
  return cached;
}

/** The Razorpay client when keys are configured, else null (UPI links are used instead). */
export function getRazorpay(): RazorpayClient | null {
  return config.razorpayKeyId && config.razorpayKeySecret ? razorpayClient(config.razorpayKeyId, config.razorpayKeySecret) : null;
}

export type { Payments, HoldStatus, PaymentMode } from "./types";
export { HoldExpiredError } from "./types";
