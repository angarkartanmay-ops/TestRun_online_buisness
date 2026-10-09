import Stripe from "stripe";
import { HoldExpiredError, type HoldStatus, type Payments } from "./types";

function mapStatus(pi: Stripe.PaymentIntent): HoldStatus {
  switch (pi.status) {
    case "requires_capture":
      return "held";
    case "succeeded":
      return "captured";
    case "canceled":
      return "canceled";
    default:
      // requires_payment_method / requires_confirmation / requires_action / processing:
      // the member can still finish (or retry with another card).
      return "requires_confirmation";
  }
}

/**
 * Stripe manual-capture PaymentIntents. Joining authorises the current price; at
 * close we capture the final (equal or lower) price and Stripe releases the rest.
 * Online card authorisations last 7 days, which is why drop windows cap at 6.
 */
export function stripePayments(secretKey: string): Payments {
  const stripe = new Stripe(secretKey, { appInfo: { name: "QUORUM" } });

  return {
    mode: "stripe",

    async createHold({ amountCents, currency, email, description, pledgeId, dropId }) {
      const pi = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency,
          capture_method: "manual",
          // Only methods that support a hold, and none that redirect away mid-join.
          automatic_payment_methods: { enabled: true, allow_redirects: "never" },
          receipt_email: email,
          description,
          metadata: { pledgeId, dropId },
        },
        { idempotencyKey: `hold-${pledgeId}` },
      );
      return { ref: pi.id, clientSecret: pi.client_secret, status: mapStatus(pi) };
    },

    async resumeHold(ref) {
      const pi = await stripe.paymentIntents.retrieve(ref);
      return { clientSecret: pi.client_secret, status: mapStatus(pi) };
    },

    async getStatus(ref) {
      return mapStatus(await stripe.paymentIntents.retrieve(ref));
    },

    async capture(ref, amountCents, idempotencyKey) {
      try {
        await stripe.paymentIntents.capture(ref, { amount_to_capture: amountCents }, { idempotencyKey });
      } catch (err) {
        if (err instanceof Stripe.errors.StripeError) {
          const pi = await stripe.paymentIntents.retrieve(ref);
          if (pi.status === "succeeded") return; // an earlier attempt already captured it
          if (pi.status === "canceled") throw new HoldExpiredError(ref);
        }
        throw err;
      }
    },

    async release(ref, idempotencyKey) {
      try {
        await stripe.paymentIntents.cancel(ref, { cancellation_reason: "abandoned" }, { idempotencyKey });
      } catch (err) {
        if (err instanceof Stripe.errors.StripeError) {
          const pi = await stripe.paymentIntents.retrieve(ref);
          if (pi.status === "canceled") return;
        }
        throw err;
      }
    },

    async refund(ref, idempotencyKey) {
      await stripe.refunds.create({ payment_intent: ref, reason: "requested_by_customer" }, { idempotencyKey });
    },
  };
}

export function stripeClient(secretKey: string) {
  return new Stripe(secretKey, { appInfo: { name: "QUORUM" } });
}
