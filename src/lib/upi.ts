/**
 * A UPI "pay" deep link for the final price. Opening it on a phone launches the
 * member's UPI app with the payee, amount and note filled in; on a computer we
 * show it as a QR code. The note carries a short reference so the admin can match
 * the payment to the member. Only ever generated after a drop has cleared.
 */
export function upiLink(opts: { vpa: string; payee: string; amountCents: number; note: string }): string {
  const q = new URLSearchParams({
    pa: opts.vpa,
    pn: opts.payee,
    am: (opts.amountCents / 100).toFixed(2),
    cu: "INR",
    tn: opts.note.slice(0, 50),
  });
  return `upi://pay?${q.toString().replace(/\+/g, "%20")}`;
}

/** Short, human-readable payment reference for a pledge: QRM-7F3A9C. */
export function payRef(pledgeId: string): string {
  return `QRM-${pledgeId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}
