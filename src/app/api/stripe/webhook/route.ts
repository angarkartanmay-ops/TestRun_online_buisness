import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { config } from "@/lib/config";
import { pledges } from "@/lib/db/schema";
import { jsonError, runAfter } from "@/lib/http";
import { stripeClient } from "@/lib/payments/stripe";
import { markHeld } from "@/lib/pledges";
import { getCtx } from "@/lib/server-ctx";

/**
 * Stripe → QUORUM. The browser also confirms holds directly, so this is the
 * safety net for closed tabs and dropped connections. Every handler is idempotent.
 */
export async function POST(req: Request) {
  if (!config.stripeSecretKey || !config.stripeWebhookSecret) {
    return jsonError(503, "not_configured", "Stripe webhooks aren't configured on this server.");
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) return jsonError(400, "bad_signature", "Missing Stripe signature.");

  let event: Stripe.Event;
  try {
    event = stripeClient(config.stripeSecretKey).webhooks.constructEvent(await req.text(), sig, config.stripeWebhookSecret);
  } catch {
    return jsonError(400, "bad_signature", "Signature check failed.");
  }

  const ctx = await getCtx();
  if (event.type.startsWith("payment_intent.")) {
    const pi = event.data.object as Stripe.PaymentIntent;
    const pledgeId = pi.metadata?.pledgeId;
    if (pledgeId) {
      if (event.type === "payment_intent.amount_capturable_updated" && pi.status === "requires_capture") {
        runAfter(await markHeld(ctx, pledgeId));
      } else if (event.type === "payment_intent.canceled") {
        // An authorisation that lapsed or was voided outside settlement.
        await ctx.db
          .update(pledges)
          .set({ status: "released", releaseReason: "hold_canceled", updatedAt: ctx.now() })
          .where(and(eq(pledges.id, pledgeId), eq(pledges.status, "pending")));
      }
    }
  }
  return NextResponse.json({ received: true });
}
