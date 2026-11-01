import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay Payment Links: one link per member, for the final price, created when
 * a drop clears. Razorpay emails/SMSes the member and calls our webhook when it's
 * paid. Uses Razorpay's REST API directly — no SDK, nothing held in advance.
 */
export type PaymentLink = { id: string; shortUrl: string };

export type PaymentLinkInput = {
  amountCents: number;
  currency: string;
  pledgeId: string;
  description: string;
  email: string;
  expireBy: Date;
  callbackUrl: string;
};

export type RazorpayClient = { createPaymentLink(input: PaymentLinkInput): Promise<PaymentLink> };

export function razorpayClient(keyId: string, keySecret: string, fetchImpl: typeof fetch = fetch): RazorpayClient {
  const auth = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
  return {
    async createPaymentLink(i) {
      const res = await fetchImpl("https://api.razorpay.com/v1/payment_links", {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: i.amountCents,
          currency: i.currency.toUpperCase(),
          accept_partial: false,
          reference_id: i.pledgeId,
          description: i.description.slice(0, 255),
          customer: { email: i.email },
          notify: { email: true, sms: false },
          reminder_enable: true,
          expire_by: Math.floor(i.expireBy.getTime() / 1000),
          callback_url: i.callbackUrl,
          callback_method: "get",
          notes: { pledge_id: i.pledgeId },
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; short_url?: string; error?: { description?: string } };
      if (!res.ok || !body.id || !body.short_url) {
        throw new Error(`Razorpay payment link failed (${res.status}): ${body.error?.description ?? "no details"}`);
      }
      return { id: body.id, shortUrl: body.short_url };
    },
  };
}

/** Razorpay signs the raw webhook body with HMAC-SHA256 (hex) using the webhook secret. */
export function verifyRazorpaySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The pledge a paid-link webhook refers to, or null for any other event. */
export function paidPledgeId(event: unknown): string | null {
  const e = event as {
    event?: string;
    payload?: { payment_link?: { entity?: { reference_id?: string; status?: string } } };
  };
  if (e?.event !== "payment_link.paid") return null;
  const link = e.payload?.payment_link?.entity;
  return link?.status === "paid" && typeof link.reference_id === "string" ? link.reference_id : null;
}
