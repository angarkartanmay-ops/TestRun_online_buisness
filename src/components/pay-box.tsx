import { ArrowSquareOut, DeviceMobile } from "@phosphor-icons/react/dist/ssr";
import type { Ctx } from "@/lib/ctx";
import type { Pledge } from "@/lib/db/schema";
import { fmtDateTime } from "@/lib/format";
import { money } from "@/lib/money";
import { qrSvg } from "@/lib/qr";
import { upiFor } from "@/lib/settle";
import { payRef } from "@/lib/upi";
import { ClaimPaidButton } from "./claim-paid-button";

/**
 * What a member owes after a drop clears, and every way to pay it: the payment
 * link (Razorpay) if there is one, a UPI deep link for phones, and a QR code for
 * paying from a computer. Only ever rendered for an `awaiting_payment` pledge.
 */
export async function PayBox({ ctx, pledge }: { ctx: Ctx; pledge: Pick<Pledge, "id" | "chargedCents" | "payBy" | "payUrl" | "paidClaimedAt"> }) {
  const upi = upiFor(ctx, pledge);
  const qr = upi ? await qrSvg(upi) : null;
  const amount = money(pledge.chargedCents ?? 0);
  const ref = payRef(pledge.id);
  return (
    <section aria-label="Pay for this drop" className="bg-receipt border-2 border-stamp p-5 sm:p-6 grid gap-4 shadow-[6px_6px_0_var(--shadow)]">
      <div>
        <p className="label text-stamp">It cleared — pay the final price</p>
        <p className="display text-5xl num mt-1">{amount}</p>
        {pledge.payBy ? <p className="text-sm text-ink-2 mt-1">Please pay by {fmtDateTime(pledge.payBy)}. Production starts once the order is paid.</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="grid gap-3 content-start">
          {pledge.payUrl ? (
            <a href={pledge.payUrl} className="btn btn-stamp justify-self-start" rel="noopener">
              Pay {amount} <ArrowSquareOut weight="bold" size={18} />
            </a>
          ) : null}
          {upi ? (
            <>
              {/* Phones open the UPI app; computers scan the QR. The wrapper hides it — .btn sets its own display. */}
              <div className="sm:hidden">
                <a href={upi} className={`btn ${pledge.payUrl ? "btn-ghost btn-sm" : "btn-stamp"}`}>
                  <DeviceMobile weight="bold" size={18} /> Pay with a UPI app
                </a>
              </div>
              <dl className="font-mono text-sm grid gap-1">
                <div className="flex gap-3"><dt className="text-ink-3 w-16">UPI ID</dt><dd className="select-all">{ctx.upi!.vpa}</dd></div>
                <div className="flex gap-3"><dt className="text-ink-3 w-16">Amount</dt><dd className="num">{amount}</dd></div>
                <div className="flex gap-3"><dt className="text-ink-3 w-16">Note</dt><dd className="select-all">{ref}</dd></div>
              </dl>
              <p className="text-xs text-ink-3">Add the note so we can match your payment to you.</p>
              <ClaimPaidButton pledgeId={pledge.id} claimed={Boolean(pledge.paidClaimedAt)} />
            </>
          ) : null}
          {!pledge.payUrl && !upi ? <p className="text-sm text-ink-2">The organiser will send you a payment link by email.</p> : null}
        </div>
        {qr ? (
          <figure className="hidden sm:grid gap-1 justify-items-center">
            <div className="w-40 h-40 bg-white p-1 border border-line [&_svg]:w-full [&_svg]:h-full" dangerouslySetInnerHTML={{ __html: qr }} />
            <figcaption className="label text-ink-3">Scan with any UPI app</figcaption>
          </figure>
        ) : null}
      </div>
    </section>
  );
}
