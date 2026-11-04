import type { Metadata } from "next";
import Link from "next/link";
import { DropCard } from "@/components/drop-card";
import { liveBoard } from "@/lib/board";
import { listDrops } from "@/lib/drops";
import { fmtDate } from "@/lib/format";
import { money } from "@/lib/money";
import { pageCtx } from "@/lib/server-ctx";

export const metadata: Metadata = { title: "Open drops", description: "Every open drop, its live price ladder, and how many more people it needs." };

const CATEGORIES = ["apparel", "audio", "tech", "objects", "bags"];

export default async function DropsPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const ctx = await pageCtx();
  const { c } = await searchParams;
  const cat = c && CATEGORIES.includes(c) ? c : null;
  const [all, closed] = await Promise.all([liveBoard(ctx), listDrops(ctx.db, ["succeeded", "failed"])]);
  const live = cat ? all.filter((d) => d.category === cat) : all;
  // Feature the drop closest to its next tier — that's where one more person matters most.
  const featured = [...live].filter((d) => d.ladder.next).sort((a, b) => a.ladder.next!.needed - b.ladder.next!.needed)[0] ?? live[0];
  const rest = live.filter((d) => d !== featured);
  const now = ctx.now();

  return (
    <div className="mx-auto max-w-[1320px] px-4 sm:px-8 pt-10 sm:pt-14">
      <header className="grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="label text-ink-2">The board · {all.length} open</p>
          <h1 className="display text-6xl sm:text-8xl mt-2">Every one gets cheaper if you bring someone.</h1>
        </div>
        <p className="lg:col-span-5 text-ink-2 max-w-[46ch]">
          Prices shown are what everyone pays right now. Cross a tier and the new price applies to every member already in — and it never goes back up.
        </p>
      </header>

      <nav aria-label="Filter by category" className="mt-10 flex flex-wrap gap-2">
        <Link href="/drops" aria-current={!cat ? "page" : undefined} className={`btn btn-sm ${cat ? "btn-ghost" : ""}`}>
          All
        </Link>
        {CATEGORIES.map((k) => {
          const n = all.filter((d) => d.category === k).length;
          if (n === 0) return null;
          return (
            <Link key={k} href={`/drops?c=${k}`} aria-current={cat === k ? "page" : undefined} className={`btn btn-sm ${cat === k ? "" : "btn-ghost"}`}>
              {k} <span className="font-mono text-xs opacity-70">{n}</span>
            </Link>
          );
        })}
      </nav>

      {live.length === 0 ? (
        <div className="mt-10 border-2 border-dashed border-line px-6 py-16 text-center grid gap-3 justify-items-center">
          <p className="display text-4xl">Nothing open in {cat ?? "any category"} right now.</p>
          <p className="text-ink-2 max-w-[44ch]">Drops run three days at most, so the board turns over fast. Hosts open new ones every week.</p>
          <Link href="/hosts" className="btn btn-sm mt-2">
            Open one with your group
          </Link>
          <Link href="/wants" className="label text-ink-2 underline">
            Or ask for a brand you want
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-6">
          {featured ? <DropCard drop={featured} now={now} feature /> : null}
          <div className="grid gap-6 lg:grid-cols-2">
            {rest.map((d) => (
              <DropCard key={d.id} drop={d} now={now} row />
            ))}
          </div>
        </div>
      )}

      {closed.length ? (
        <section className="mt-24" aria-labelledby="closed">
          <div className="flex items-end justify-between gap-6 border-b-2 border-ink pb-4">
            <h2 id="closed" className="display text-4xl">
              Recently closed
            </h2>
            <Link href="/receipts" className="label text-ink-2 hover:text-stamp">
              Receipts →
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {closed.map((d) => (
              <li key={d.id}>
                <Link href={`/receipts/${d.slug}`} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_10rem_10rem_8rem] gap-x-6 gap-y-1 py-4 items-baseline hover:bg-paper-2 px-2 -mx-2">
                  <span>
                    <span className="label text-ink-3 block">{d.brand}</span>
                    <span className="display text-2xl">{d.item}</span>
                  </span>
                  <span className={`label ${d.status === "succeeded" ? "text-go" : "text-ink-3"}`}>{d.status === "succeeded" ? "Cleared" : "Missed quorum"}</span>
                  <span className="font-mono text-sm num hidden sm:block">{d.status === "succeeded" ? `${money(d.finalPriceCents ?? 0)} · ${d.members} in` : `${d.members} of ${d.tiers[0]!.min} — nobody paid`}</span>
                  <span className="label text-ink-3 hidden sm:block text-right">{fmtDate(d.closesAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
