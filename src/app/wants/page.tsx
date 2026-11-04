import type { Metadata } from "next";
import Link from "next/link";
import { count, money } from "@/lib/money";
import { pageCtx } from "@/lib/server-ctx";
import { listWants } from "@/lib/wants";

export const metadata: Metadata = { title: "What people want", description: "Ask for a product from a brand you love. When enough people in your city want the same thing, we take the numbers to the brand." };

export default async function WantsPage() {
  const ctx = await pageCtx();
  const rows = await listWants(ctx);
  return (
    <div className="mx-auto max-w-[1320px] px-4 sm:px-8 pt-10 sm:pt-14">
      <header className="grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="label text-ink-2">Demand board · {rows.length} requests</p>
          <h1 className="display text-6xl sm:text-8xl mt-2">Want it cheaper? Say so.</h1>
        </div>
        <div className="lg:col-span-5 grid gap-4">
          <p className="text-ink-2 max-w-[46ch]">Ask for a product from a brand you love. When enough people in a city want the same thing, we take the numbers to the brand and ask for a group price. Saying you&apos;d buy costs nothing and commits you to nothing.</p>
          <Link href="/wants/new" className="btn btn-stamp justify-self-start">Ask for something</Link>
        </div>
      </header>
      {rows.length === 0 ? (
        <div className="mt-10 border-2 border-dashed border-line px-6 py-16 text-center grid gap-3 justify-items-center">
          <p className="display text-4xl">No requests yet.</p>
          <p className="text-ink-2">Be the first. What would you buy if the price dropped?</p>
        </div>
      ) : (
        <ul className="mt-10 divide-y divide-line border-y border-line">
          {rows.map((w) => (
            <li key={w.id}>
              <Link href={`/wants/${w.slug}`} className="grid grid-cols-[4.5rem_1fr_auto] gap-4 items-center py-4 hover:bg-receipt/60 px-2">
                <span className="display text-4xl text-stamp">{count(w.votes)}</span>
                <span>
                  <span className="display text-2xl block">{w.brand} {w.item}</span>
                  <span className="label text-ink-3">{w.city} · {w.category}{w.status === "answered" ? " · brand replied" : ""}</span>
                </span>
                <span className="label text-ink-2 text-right">{w.medianPriceCents ? `would pay ~${money(w.medianPriceCents)}` : "no price yet"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-sm text-ink-3 max-w-[70ch]">Requests are not sales and QUORUM is not affiliated with the brands named. A request becomes a drop only if the brand agrees.</p>
    </div>
  );
}
