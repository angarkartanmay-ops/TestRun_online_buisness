import { emailLog } from "./db/schema";
import type { Ctx } from "./ctx";
import type { Mail } from "./mailer";
import { money } from "./money";

/** Send and log. A delivery failure is recorded, never thrown — email must not block a join. */
export async function deliver(ctx: Ctx, mail: Mail): Promise<boolean> {
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

type DropLike = { brand: string; item: string; slug: string };

export const mails = {
  loginCode: (to: string, code: string): Mail => ({
    to,
    kind: "login_code",
    subject: `${code} is your QUORUM code`,
    text: `Your sign-in code is ${code}.\n\nIt works once and expires in 10 minutes. If you didn't ask for it, ignore this — nobody can sign in without the code.${sig}`,
  }),

  joined: (ctx: Ctx, to: string, d: DropLike, holdCents: number, crewUrl: string, closesAt: Date): Mail => ({
    to,
    kind: "joined",
    subject: `You're in: ${d.brand} ${d.item}`,
    text:
      `Your card has a hold of ${money(holdCents, ctx.currency)} — that's the most you can pay. ` +
      `Nothing is charged until the drop closes on ${closesAt.toUTCString()}, and then only the final price, which can only go down from here.\n\n` +
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

  charged: (ctx: Ctx, to: string, d: DropLike, chargedCents: number, retailCents: number, shipBy: Date): Mail => ({
    to,
    kind: "charged",
    subject: `Drop cleared: charged ${money(chargedCents, ctx.currency)} for ${d.item}`,
    text:
      `The drop closed and cleared. We charged ${money(chargedCents, ctx.currency)} — retail is ${money(retailCents, ctx.currency)}. ` +
      `Any difference from your original hold has been released by your bank.\n\n` +
      `Production starts now. It ships by ${shipBy.toDateString()}; if it doesn't, you get a full refund without asking.\n\n` +
      `The full cost receipt: ${ctx.siteUrl}/receipts/${d.slug}${sig}`,
  }),

  released: (ctx: Ctx, to: string, d: DropLike, reason: "missed_quorum" | "canceled" | "left"): Mail => ({
    to,
    kind: "released",
    subject:
      reason === "left" ? `You've left the ${d.item} drop` : `Drop didn't run — your hold is released`,
    text:
      (reason === "missed_quorum"
        ? `The ${d.brand} ${d.item} drop closed without reaching quorum, so nothing will be made and nobody is charged. `
        : reason === "canceled"
          ? `The ${d.brand} ${d.item} drop was cancelled before it closed. Nobody is charged. `
          : `You left the ${d.brand} ${d.item} drop. `) +
      `Your hold has been released; depending on your bank it disappears within a few days.${sig}`,
  }),
};
