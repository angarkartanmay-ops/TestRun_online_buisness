import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CrewShare } from "@/components/crew-share";
import { config } from "@/lib/config";
import { drops, payouts, pledges } from "@/lib/db/schema";
import { COUNTED } from "@/lib/drops";
import { fmtDate } from "@/lib/format";
import { bps, money } from "@/lib/money";
import { rules } from "@/lib/rules";
import { pageCtx } from "@/lib/server-ctx";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Host dashboard" };

export default async function HostDashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/me/host");
  if (user.hostStatus !== "approved") redirect("/hosts");
  const ctx = await pageCtx();

  const [paid, open] = await Promise.all([
    ctx.db.select({ p: payouts, d: drops }).from(payouts).innerJoin(drops, eq(drops.id, payouts.dropId)).where(eq(payouts.hostUserId, user.id)).orderBy(desc(payouts.createdAt)),
    ctx.db
      .select({ dropId: drops.id, slug: drops.slug, item: drops.item, brand: drops.brand, closesAt: drops.closesAt, members: sql<number>`count(*)::int`, held: sql<number>`sum(${pledges.heldCents})::int` })
      .from(pledges)
      .innerJoin(drops, eq(drops.id, pledges.dropId))
      .where(and(eq(pledges.referrerId, user.id), inArray(pledges.status, [...COUNTED]), eq(drops.status, "live")))
      .groupBy(drops.id),
  ]);
  const pending = paid.filter((r) => r.p.status === "pending").reduce((s, r) => s + r.p.amountCents, 0);
  const lifetime = paid.filter((r) => r.p.status !== "void").reduce((s, r) => s + r.p.amountCents, 0);
  const projected = open.reduce((s, r) => s + bps(r.held ?? 0, rules.hostShareBps), 0);

  return (
    <div className="mx-auto max-w-[1320px] px-4 sm:px-8 pt-10 sm:pt-14 grid gap-14">
      <header className="grid gap-8 lg:grid-cols-12 lg:items-end border-b-2 border-ink pb-10">
        <div className="lg:col-span-6">
          <p className="label text-ink-2">Host · {user.email}</p>
          <h1 className="display text-6xl sm:text-8xl mt-2">Host dashboard</h1>
        </div>
        <dl className="lg:col-span-6 grid grid-cols-3 gap-4">
          {[
            ["Open drops, at most", money(projected)],
            ["Owed to you", money(pending)],
            ["Lifetime", money(lifetime)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="label text-ink-3">{k}</dt>
              <dd className="display text-4xl num mt-1">{v}</dd>
            </div>
          ))}
        </dl>
      </header>
      <section className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7 grid gap-10">
          <div>
            <h2 className="display text-4xl">Your crew in open drops</h2>
            {open.length === 0 ? (
              <p className="text-ink-2 mt-3">Nobody has joined an open drop from your link yet. Post it where your group already talks.</p>
            ) : (
              <ul className="divide-y divide-line border-y border-line mt-4">
                {open.map((r) => (
                  <li key={r.dropId} className="flex justify-between gap-4 py-3">
                    <Link href={`/drops/${r.slug}`} className="hover:text-stamp">
                      <span className="label text-ink-3 block">{r.brand}</span>
                      <span className="display text-2xl">{r.item}</span>
                    </Link>
                    <span className="text-right font-mono text-sm num">
                      {r.members} members
                      <span className="block text-ink-3">closes {fmtDate(r.closesAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h2 className="display text-4xl">Payouts</h2>
            {paid.length === 0 ? (
              <p className="text-ink-2 mt-3">Payouts appear when a drop your crew joined clears. You&apos;re paid 14 days after it ships.</p>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="w-full font-mono text-sm">
                  <thead>
                    <tr className="label text-ink-3 border-b-2 border-ink text-left">
                      <th className="py-2 pr-4 font-medium">Drop</th>
                      <th className="py-2 pr-4 font-medium text-right">Members</th>
                      <th className="py-2 pr-4 font-medium text-right">Volume</th>
                      <th className="py-2 pr-4 font-medium text-right">You</th>
                      <th className="py-2 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {paid.map(({ p, d }) => (
                      <tr key={p.id}>
                        <td className="py-2.5 pr-4">{d.item}</td>
                        <td className="py-2.5 pr-4 text-right num">{p.members}</td>
                        <td className="py-2.5 pr-4 text-right num">{money(p.volumeCents)}</td>
                        <td className="py-2.5 pr-4 text-right num font-bold">{money(p.amountCents)}</td>
                        <td className={`py-2.5 text-right label ${p.status === "paid" ? "text-go" : p.status === "void" ? "text-ink-3" : "text-warn"}`}>{p.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <aside className="lg:col-span-5 bg-receipt border-2 border-ink p-5 grid gap-4 self-start">
          <p className="display text-3xl">Your host link</p>
          <p className="text-sm text-ink-2">Every member who joins any drop from this link earns you {rules.hostShareBps / 100}% of what they pay — out of our fee, never added to theirs. Members see that on their receipt.</p>
          <CrewShare url={`${config.siteUrl}/?c=${user.crewCode}`} message="We're buying together on QUORUM — the price drops the more of us join:" />
        </aside>
      </section>
    </div>
  );
}
