import { commitPayments } from "./commit";
import { demoPayments } from "./demo";
import type { PaymentMode, Payments } from "./types";

const unconfigured = (mode: PaymentMode): Payments => {
  const fail = async (): Promise<never> => {
    throw new Error(`This pledge was made with ${mode}, which isn't configured on this server.`);
  };
  return { mode, createHold: fail, resumeHold: fail, getStatus: fail, capture: fail, release: fail, refund: fail };
};

/**
 * The provider that owns a pledge. A server can hold pledges from more than one
 * provider — practice drops always use demo, whatever the server is configured
 * for — so every hold operation is routed by the pledge, never by the server.
 * A pledge whose provider is no longer configured fails loudly instead of being
 * silently marked paid.
 */
export function paymentsFor(ctx: { payments: Payments }, provider: PaymentMode): Payments {
  if (provider === ctx.payments.mode) return ctx.payments;
  if (provider === "demo") return demoPayments;
  if (provider === "commit") return commitPayments;
  return unconfigured(provider);
}
