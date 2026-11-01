import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CrewShare } from "@/components/crew-share";
import { PayBox } from "@/components/pay-box";
import { SpecimenPlate } from "@/components/plate";
import { SignOutButton } from "@/components/sign-out-button";
import { config, payStyle } from "@/lib/config";
import { fmtDate } from "@/lib/format";
import { money } from "@/lib/money";
import { crewSize, pledgesForUser } from "@/lib/pledges";
import { pageCtx } from "@/lib/server-ctx";
import { getSessionUser } from "@/lib/session";
import { currentPriceCents } from "@/lib/tiers";

export const metadata: Metadata = { title: "My drops" };

const card = payStyle === "card";

const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "Card not confirmed", tone: "text-warn" },
  held: { label: card ? "Held" : "In — nothing paid yet", tone: "text-ink" },
  capturing: { label: card ? "Charging" : "Closing", tone: "text-ink" },
  awaiting_payment: { label: "Cleared — pay now", tone: "text-stamp" },
  charged: { label: card ? "Charged" : "Paid", tone: "text-go" },
  refunded: { label: "Refunded", tone: "text-ink-3" },
  released: { label: "Released", tone: "text-ink-3" },
  failed: { label: card ? "Card declined" : "Not paid", tone: "text-stamp" },
};

const REASON: Record<string, string> = {
  left: "You left",
  missed_quorum: "Missed quorum — nobody paid",
  canceled: "Drop cancelled",
  never_confirmed: "Card never confirmed",
  hold_expired: "Hold expired",
  card_declined: "Card declined",
  unpaid: "Not paid in time — spot released",
};

export default async function MePage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/me");
  const ctx = await pageCtx();
  const [rows, crew] = await Promise.all([pledgesForUser(ctx, user.id), crewSize(ctx, user.id)]);
  const owing = rows.filter((r) => r.pledge.status === "awaiting_payment");
  const active = rows.filter((r) => ["pending", "held", "capturing"].includes(r.pledge.status) && r.drop.status !== "failed");
  const past = rows.filter((r) => !active.includes(r) && !owing.includes(r));
  const saved = rows
    .filter((r) => r.pledge.status === "charged" && !r.drop.practice)
    .reduce((s, r) => s + (r.drop.retailCents - (r.pledge.chargedCents ?? 0)), 0);

  return (
    <div className="mx-auto max-w-[1320px] px-4 sm:px-8 pt-10 sm:pt-14 grid gap-14">
      <header className="grid gap-8 lg:grid-cols-12 lg:items-end border-b-2 border-ink pb-10">
        <div className="lg:col-span-7">
          <p className="label text-ink-2">Member · {user.email}</p>
          <h1 className="display text-6xl sm:text-8xl mt-2">My drops</h1>
        </div>
        <dl className="lg:col-span-5 grid grid-cols-3 gap-4">
          {[
            ["In now", String(active.length)],
            ["Crew brought", String(crew)],
            ["Kept vs retail", money(saved)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="label text-ink-3">{k}</dt>
              <dd className="display text-4xl num mt-1">{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      {owing.length ? (
        <section className="grid gap-6" aria-labelledby="to-pay">
          <h2 id="to-pay" className="display text-4xl">To pay · {owing.length}</h2>
          {owing.map(({ pledge, drop }) => (
            <div key={pledge.id} className="grid gap-3 lg:grid-cols-12 lg:items-start">
              <div className="lg:col-span-4">
                <p className="label text-ink-3">{drop.brand}</p>
                <Link href={`/drops/${drop.slug}`} className="display text-3xl hover:text-stamp">
                  {drop.item}
                </Link>
                {pledge.size ? <p className="label text-ink-2 mt-1">Size {pledge.size}</p> : null}
              </div>
              <div className="lg:col-span-8">
                <PayBox ctx={ctx} pledge={pledge} />
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7 grid gap-4 content-start">
          <h2 className="display text-4xl">In progress</h2>
          {active.length === 0 ? (
            <div className="border-2 border-dashed border-line p-8 grid gap-3 justify-items-start">
              <p className="text-ink-2">You&apos;re not in any open drops.</p>
              <Link href="/drops" className="btn btn-sm btn-stamp">
                Browse the board
              </Link>
            </div>
          ) : (
            <ul className="grid gap-3">
              {active.map(({ pledge, drop }) => {
                const nowPrice = currentPriceCents(drop.tiers, drop.unlockedTier);
                return (
                  <li key={pledge.id}>
                    <Link href={`/drops/${drop.slug}`} className="grid grid-cols-[5rem_1fr_auto] gap-4 items-center bg-receipt border border-line hover:border-ink p-3">
                      <SpecimenPlate drop={drop} size="sm" className="aspect-square [&_.label]:hidden" />
                      <span>
                        <span className="label text-ink-3 block">{drop.brand}</span>
                        <span className="display text-2xl block">{drop.item}</span>
                        <span className={`label ${STATUS[pledge.status]?.tone}`}>
                          {drop.practice ? "Practice · " : ""}
                          {STATUS[pledge.status]?.label} · closes {fmtDate(drop.closesAt)}
                          {pledge.size ? ` · size ${pledge.size}` : ""}
                        </span>
                      </span>
                      <span className="text-right font-mono text-sm num">
                        <span className="display text-stamp text-3xl block">{money(Math.min(nowPrice, pledge.heldCents))}</span>
                        <span className="text-ink-3">{card ? "held" : "at most"} {money(pledge.heldCents)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <aside className="lg:col-span-5 grid gap-6 content-start">
          <div className="bg-receipt border-2 border-ink p-5 grid gap-4">
            <p className="display text-3xl">Your crew link</p>
            <p className="text-sm text-ink-2">Anyone who joins any drop from this link counts as your crew. {user.hostStatus === "approved" ? "As a host, your club fund earns a share of what they buy." : ""}</p>
            <CrewShare url={`${config.siteUrl}/?c=${user.crewCode}`} message="I'm in a buyers' union where the price drops the more of us join —" />
          </div>
          <div className="border border-line p-5 grid gap-3">
            <p className="label text-ink-2">Host status</p>
            {user.hostStatus === "approved" ? (
              <Link href="/me/host" className="btn btn-sm justify-self-start">
                Open host dashboard
              </Link>
            ) : user.hostStatus === "pending" ? (
              <p className="text-ink-2">Application in review. We reply within three working days.</p>
            ) : (
              <>
                <p className="text-ink-2">Run a drop for your batch, club or fest — the club fund gets a share of everything it sells.</p>
                <Link href="/hosts#apply" className="btn btn-sm btn-ghost justify-self-start">
                  Apply to host
                </Link>
              </>
            )}
          </div>
          <SignOutButton />
        </aside>
      </section>

      {past.length ? (
        <section>
          <h2 className="display text-4xl border-b-2 border-ink pb-3">History</h2>
          <ul className="divide-y divide-line">
            {past.map(({ pledge, drop }) => (
              <li key={pledge.id} className="grid grid-cols-[1fr_auto] gap-4 py-4 items-baseline">
                <Link href={drop.status === "live" ? `/drops/${drop.slug}` : `/receipts/${drop.slug}`} className="hover:text-stamp">
                  <span className="label text-ink-3 block">{drop.brand}</span>
                  <span className="display text-2xl">{drop.item}</span>
                </Link>
                <span className="text-right">
                  <span className={`label block ${STATUS[pledge.status]?.tone}`}>
                    {pledge.status === "released" ? REASON[pledge.releaseReason ?? ""] ?? "Released" : STATUS[pledge.status]?.label}
                  </span>
                  <span className="font-mono text-sm num">{pledge.status === "charged" && pledge.chargedCents && !drop.practice ? money(pledge.chargedCents) : money(0)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
