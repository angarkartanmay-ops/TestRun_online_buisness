import type { DB } from "./db";
import type { Mailer } from "./mailer";
import type { RazorpayClient } from "./payments/razorpay";
import type { Payments } from "./payments/types";

/** Everything a service needs, passed in so tests can substitute fakes. */
export type Ctx = {
  db: DB;
  payments: Payments;
  mailer: Mailer;
  now: () => Date;
  siteUrl: string;
  currency: string;
  /** Pay-after-close collection: a Razorpay client for payment links, and/or a UPI ID. */
  razorpay?: RazorpayClient | null;
  upi?: { vpa: string; payee: string } | null;
};
