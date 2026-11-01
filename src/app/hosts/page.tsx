import type { Metadata } from "next";
import Link from "next/link";
import { HostApplyForm } from "@/components/apply-forms";
import { EarningsEstimator } from "@/components/earnings-estimator";
import { count, money } from "@/lib/money";
import { rules } from "@/lib/rules";
import { getSessionUser } from "@/lib/session";

const SHARE = rules.houseHostShareBps;

export const metadata: Metadata = {
  title: "Host a drop",
  description: `Batch hoodies, fest tees, club merch. Bring the group, post one link — nobody fronts the money, and your club fund gets ${SHARE / 100}% of what it sells.`,
};

/** [group, reach, joined, price in paise] — illustrative shapes, not real drops. */
const SAMPLE: [string, number, number, number][] = [
  ["Friends group chat", 18, 9, 69900],
  ["One batch, one department", 120, 52, 89900],
  ["Hostel block WhatsApp", 450, 41, 39900],
  ["Fest crew + volunteers", 300, 118, 47900],
  ["College dance society", 600, 64, 64900],
  ["Campus meme page, 40k", 40_000, 180, 54900],
];

export default async function HostsPage() {
  const user = await getSessionUser();
  return (
    <div className="mx-auto max-w-[1320px] px-4 sm:px-8 pt-10 sm:pt-14">
      <section className="grid gap-12 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-6">
          <p className="label text-ink-2">Host program · {SHARE / 100}% to your club fund</p>
          <h1 className="display text-6xl sm:text-8xl mt-2">Your group chat is a purchasing department.</h1>
          <p className="mt-6 text-lg text-ink-2 max-w-[48ch]">
            Batch hoodie, fest tee, society tote. Today someone fronts the money, chases forty people on WhatsApp for sizes and payments, and ends up with three spare XLs. Here you post one link: sizes and payments collect themselves, the price drops as people join, nobody pays unless it reaches its first tier — and your club fund gets {SHARE / 100}% of what it sells.
          </p>
          <div className="mt-8 flex gap-3 flex-wrap">
            <Link href="#apply" className="btn btn-stamp">
              Apply to host
            </Link>
            {user?.hostStatus === "approved" ? (
              <Link href="/me/host" className="btn btn-ghost">
                Host dashboard
              </Link>
            ) : null}
          </div>
        </div>
        <div className="lg:col-span-6">
          <EarningsEstimator shareBps={SHARE} />
        </div>
      </section>

      <section className="mt-24 border-t-2 border-ink pt-10 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 className="display text-5xl">The best hosts are rarely the biggest.</h2>
          <p className="mt-4 text-ink-2">A batch that wants the same hoodie converts far better than a big page with nothing in common. Same {SHARE / 100}% either way.</p>
          <p className="mt-3 label text-ink-3">Illustrative sample — what different group shapes look like</p>
        </div>
        <div className="lg:col-span-8 overflow-x-auto">
          <table className="w-full font-mono text-sm min-w-[36rem]">
            <thead>
              <tr className="label text-ink-3 border-b-2 border-ink text-left">
                <th className="py-2 pr-4 font-medium">Group</th>
                <th className="py-2 pr-4 font-medium text-right">Reach</th>
                <th className="py-2 pr-4 font-medium text-right">Joined</th>
                <th className="py-2 pr-4 font-medium text-right">Rate</th>
                <th className="py-2 font-medium text-right">Club fund</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {SAMPLE.map(([g, reach, joined, price]) => (
                <tr key={g}>
                  <td className="py-3 pr-4 font-sans">{g}</td>
                  <td className="py-3 pr-4 text-right num">{count(reach)}</td>
                  <td className="py-3 pr-4 text-right num">{count(joined)}</td>
                  <td className={`py-3 pr-4 text-right num ${joined / reach > 0.1 ? "text-go font-bold" : "text-ink-3"}`}>{((joined / reach) * 100).toFixed(joined / reach < 0.01 ? 2 : 1)}%</td>
                  <td className="py-3 text-right num">{money(Math.round((joined * price * SHARE) / 1_000_000) * 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-24 grid gap-10 lg:grid-cols-12" id="apply">
        <div className="lg:col-span-5">
          <p className="label text-ink-2">Terms, all of them</p>
          <dl className="mt-4 divide-y divide-line border-y border-line">
            {[
              ["Rate", `${SHARE / 100}% of what your drop sells, to your club fund`],
              ["Paid from", "Our margin — it's a line on the receipt, never a surcharge"],
              ["When", "14 days after the drop ships, by UPI"],
              ["You do", "Pick the design, share the link, hand out the order on campus"],
              ["We do", "Price the ladder, collect sizes and payments, get it made and delivered"],
              ["Missed quorum", `${money(0)} to you, ${money(0)} to us — nobody pays anything`],
              ["Disclosure", "Your share is printed on the member's receipt"],
              ["Exclusivity", "None. Host anywhere, leave any time."],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[8rem_1fr] gap-4 py-3">
                <dt className="label text-ink-3 pt-0.5">{k}</dt>
                <dd className="text-ink-2">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="lg:col-span-6 lg:col-start-7 bg-receipt border-2 border-ink p-6 sm:p-8 self-start">
          <h2 className="display text-4xl mb-6">Tell us what your group would buy</h2>
          {user ? (
            user.hostStatus === "approved" ? (
              <p className="text-go font-semibold">You&apos;re an approved host. <Link href="/me/host" className="underline">Open your dashboard</Link>.</p>
            ) : (
              <HostApplyForm />
            )
          ) : (
            <div className="grid gap-4 justify-items-start">
              <p className="text-ink-2">Sign in first — your application is tied to your member card, so your crew link starts earning the day you&apos;re approved.</p>
              <Link href="/sign-in?next=/hosts%23apply" className="btn btn-stamp">
                Sign in to apply
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
