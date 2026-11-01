import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { jsonError } from "@/lib/http";
import { paidPledgeId, verifyRazorpaySignature } from "@/lib/payments/razorpay";
import { getCtx } from "@/lib/server-ctx";
import { markPaid } from "@/lib/settle";

/**
 * Razorpay → QUORUM. Subscribe to `payment_link.paid` in the Razorpay dashboard
 * with this URL and RAZORPAY_WEBHOOK_SECRET. Signature-checked on the raw body;
 * idempotent, so Razorpay's retries are harmless.
 */
export async function POST(req: Request) {
  if (!config.razorpayWebhookSecret) return jsonError(503, "not_configured", "Razorpay webhooks aren't configured on this server.");
  const raw = await req.text();
  if (!verifyRazorpaySignature(raw, req.headers.get("x-razorpay-signature"), config.razorpayWebhookSecret)) {
    return jsonError(400, "bad_signature", "Signature check failed.");
  }
  let event: unknown;
  try {
    event = JSON.parse(raw);
  } catch {
    return jsonError(400, "bad_body", "Not JSON.");
  }
  const pledgeId = paidPledgeId(event);
  if (pledgeId) await markPaid(await getCtx(), pledgeId);
  return NextResponse.json({ received: true });
}
