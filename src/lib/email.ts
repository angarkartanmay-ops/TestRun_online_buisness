import { emailLog } from "./db/schema";
import type { Ctx } from "./ctx";
import { fmtDate, fmtDateTimeZone } from "./format";
import type { Mail } from "./mailer";
import { money } from "./money";
import type { PaymentMode } from "./payments/types";

/**
 * Send and log. A delivery failure is recorded, never thrown — email must not
 * block a join. Addresses on the reserved `.invalid` TLD (simulated practice-drop
 * members) are skipped: they can't receive mail, and trying would burn the quota.
 */
export async function deliver(ctx: Ctx, mail: Mail): Promise<boolean> {
  if (mail.to.toLowerCase().endsWith(".invalid")) return true;
  const result = await ctx.mailer.send(mail);
  await ctx.db.insert(emailLog).values({
    to: mail.to,
    // The sign-in subject carries the code itself — never let it reach the database.
    subject: mail.kind === "login_code" ? "Sign-in code" : mail.subject,
    kind: mail.kind,
    status: !result.ok ? "failed" : ctx.mailer.mode === "resend" ? "sent" : "logged",
    error: result.error ?? null,
  });
  return result.ok;
}

const sig = "\n\n— QUORUM, a buyers' union\nThe price only falls. The receipt is always published.";

type DropLike = { brand: string; item: string; slug: string; practice?: boolean };

/** Card holds speak of holds; pay-after-close and practice pledges speak of promises. */
const isCard = (provider: PaymentMode) => provider === "stripe";

export const mails = {
  loginCode: (to: string, code: string): Mail => ({
    to,
    kind: "login_code",
    subject: `${code} is your QUORUM code`,
    text: `Your sign-in code is ${code}.\n\nIt works once and expires in 10 minutes. If you didn't ask for it, ignore this — nobody can sign in without the code.${sig}`,
  }),

  joined: (ctx: Ctx, to: string, d: DropLike, holdCents: number, crewUrl: string, closesAt: Date, provider: PaymentMode): Mail => ({
    to,
    kind: "joined",
    subject: `You're in: ${d.brand} ${d.item}`,
    text:
      (d.practice
        ? `This is a practice drop — nobody pays, ever. It's here so you can see how a drop works.\n\n`
        : isCard(provider)
          ? `Your card has a hold of ${money(holdCents, ctx.currency)} — that's the most you can pay. ` +
            `Nothing is charged until the drop closes on ${fmtDateTimeZone(closesAt)}, and then only the final price, which can only go down from here.\n\n`
          : `Nothing to pay now. Joining is a promise to buy at the final price — ${money(holdCents, ctx.currency)} at most, and it can only go down from here. ` +
            `When the drop closes on ${fmtDateTimeZone(closesAt)}, if it reached its first tier you'll get one link to pay the final price. ` +
            `If it doesn't, nothing happens and you owe nothing.\n\n`) +
      `Every person you bring moves the price for everyone. Your crew link:\n${crewUrl}${sig}`,
  }),

  tierUnlocked: (ctx: Ctx, to: string, d: DropLike, priceCents: number, members: number): Mail => ({
    to,
    kind: "tier_unlocked",
    subject: `Price dropped to ${money(priceCents, ctx.currency)} — ${d.brand} ${d.item}`,
    text:
      `${members} members are in, which unlocked ${money(priceCents, ctx.currency)} for everyone — including you. ` +
      `Unlocked tiers never re-lock.\n\n${ctx.siteUrl}/drops/${d.slug}${sig}`,
  }),

  /** Card mode, or a practice drop: the drop cleared and the member's part is done. */
  charged: (ctx: Ctx, to: string, d: DropLike, chargedCents: number, retailCents: number, shipBy: Date): Mail => ({
    to,
    kind: "charged",
    subject: d.practice ? `Practice drop cleared at ${money(chargedCents, ctx.currency)} — nothing to pay` : `Drop cleared: charged ${money(chargedCents, ctx.currency)} for ${d.item}`,
    text: d.practice
      ? `The practice drop closed at ${money(chargedCents, ctx.currency)} — retail is ${money(retailCents, ctx.currency)}. ` +
        `On a real drop you'd now pay that final price and production would start. This one was practice, so nothing is owed and nothing ships.${sig}`
      : `The drop closed and cleared. We charged ${money(chargedCents, ctx.currency)} — retail is ${money(retailCents, ctx.currency)}. ` +
        `Any difference from your original hold has been released by your bank.\n\n` +
        `Production starts now. It ships by ${fmtDate(shipBy)}; if it doesn't, you get a full refund without asking.\n\n` +
        `The full cost receipt: ${ctx.siteUrl}/receipts/${d.slug}${sig}`,
  }),

  /** Pay after close: the drop cleared — here is the final price and where to pay it. */
  payNow: (
    ctx: Ctx,
    to: string,
    d: DropLike,
    o: { amountCents: number; retailCents: number; payBy: Date; shipBy: Date; payUrl: string | null; upi: { vpa: string; ref: string } | null },
  ): Mail => ({
    to,
    kind: "pay_now",
    subject: `Drop cleared: pay ${money(o.amountCents, ctx.currency)} for ${d.item} by ${fmtDate(o.payBy)}`,
    text:
      `The ${d.brand} ${d.item} drop cleared at ${money(o.amountCents, ctx.currency)} — retail is ${money(o.retailCents, ctx.currency)}. ` +
      `That's the final price for everyone, whenever they joined.\n\n` +
      (o.payUrl ? `Pay here: ${o.payUrl}\n` : "") +
      (o.upi ? `${o.payUrl ? "Or pay" : "Pay"} by UPI: ${money(o.amountCents, ctx.currency)} to ${o.upi.vpa}, with the note ${o.upi.ref}\n` : "") +
      `Your payment page: ${ctx.siteUrl}/me\n\n` +
      `Please pay by ${fmtDateTimeZone(o.payBy)}. Production starts once the order is paid, ` +
      `and it ships by ${fmtDate(o.shipBy)} — or every member gets a full refund.${sig}`,
  }),

  paid: (ctx: Ctx, to: string, d: DropLike, amountCents: number, shipBy: Date): Mail => ({
    to,
    kind: "paid",
    subject: `Paid: ${money(amountCents, ctx.currency)} for ${d.item}`,
    text:
      `Payment received — thank you. You're on the production order for the ${d.brand} ${d.item}.\n\n` +
      `It ships by ${fmtDate(shipBy)}; if it doesn't, you get a full refund without asking.\n\n` +
      `The full cost receipt: ${ctx.siteUrl}/receipts/${d.slug}${sig}`,
  }),

  unpaid: (_ctx: Ctx, to: string, d: DropLike): Mail => ({
    to,
    kind: "unpaid",
    subject: `Your spot on ${d.item} was released`,
    text:
      `We didn't receive your payment for the ${d.brand} ${d.item} drop before the deadline, so your spot was released and nothing will be made for you. ` +
      `If you think you did pay, reply to this email with the UPI reference and we'll sort it out.${sig}`,
  }),

  released: (ctx: Ctx, to: string, d: DropLike, reason: "missed_quorum" | "canceled" | "left", provider: PaymentMode = "commit"): Mail => {
    const card = isCard(provider);
    return {
      to,
      kind: "released",
      subject:
        reason === "left" ? `You've left the ${d.item} drop` : card ? `Drop didn't run — your hold is released` : `Drop didn't run — you owe nothing`,
      text:
        (reason === "missed_quorum"
          ? `The ${d.brand} ${d.item} drop closed without reaching quorum, so nothing will be made and nobody pays. `
          : reason === "canceled"
            ? `The ${d.brand} ${d.item} drop was cancelled before it closed. Nobody pays. `
            : `You left the ${d.brand} ${d.item} drop. `) +
        (card ? `Your hold has been released; depending on your bank it disappears within a few days.` : `There was never any money held, so there's nothing to refund.`) +
        sig,
    };
  },
};
