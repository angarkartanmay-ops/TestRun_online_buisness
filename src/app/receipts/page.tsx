import type { Metadata } from "next";
import Link from "next/link";
import { listDrops } from "@/lib/drops";
import { fmtDate } from "@/lib/format";
import { money } from "@/lib/money";
import { pageCtx } from "@/lib/server-ctx";

export const metadata: Metadata = { title: "Published receipts", description: "The full cost breakdown of every drop that cleared — and the honest record of the ones that didn't." };

export default async function ReceiptsPage() {
  const ctx = await pageCtx();
  const closed = await listDrops(ctx.db, ["succeeded", "failed", "canceled"]);
  const cleared = closed.filter((d) => d.status === "succeeded");
  const missed = closed.length - cleared.length;
  return (
    <div className="mx-auto max-w-[1320px] px-4 sm:px-8 pt-10 sm:pt-14">
      <header className="grid gap-6 lg:grid-cols-12 lg:items-end border-b-2 border-ink pb-10">
        <div className="lg:col-span-8">
          <p className="label text-ink-2">The ledger</p>
          <h1 className="display text-6xl sm:text-8xl mt-2">Every drop, including the ones that didn&apos;t run.</h1>
        </div>
        <dl className="lg:col-span-4 grid grid-cols-2 gap-4">
          <div>
            <dt className="label text-ink-3">Cleared</dt>
            <dd className="display text-5xl num text-go">{cleared.length}</dd>
          </div>
          <div>
            <dt className="label text-ink-3">Missed quorum</dt>
            <dd className="display text-5xl num">{missed}</dd>
          </div>
        </dl>
      </header>
      {closed.length === 0 ? (
        <p className="py-16 text-ink-2">No drop has closed yet. The first receipt is published the moment one clears.</p>
      ) : (
        <ul className="divide-y divide-line">
          {closed.map((d) => (
            <li key={d.id}>
              <Link href={`/receipts/${d.slug}`} className="grid gap-2 sm:grid-cols-[1fr_auto] items-baseline py-6 group">
                <span>
                  <span className="label text-ink-3">
                    {d.brand} · closed {fmtDate(d.closesAt)}
                  </span>
                  <span className="display text-4xl block mt-1 group-hover:text-stamp transition-colors">{d.item}</span>
                </span>
                <span className="font-mono text-sm num text-right">
                  {d.status === "succeeded" ? (
                    <>
                      <span className="text-go font-bold">{money(d.finalPriceCents ?? 0)}</span> · {d.members} members · kept {money(d.retailCents - (d.finalPriceCents ?? 0))} each
                    </>
                  ) : (
                    <span className="text-ink-3">
                      {d.status === "canceled" ? "Cancelled" : `Missed quorum at ${d.members} of ${d.tiers[0]!.min}`} — nobody charged
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
