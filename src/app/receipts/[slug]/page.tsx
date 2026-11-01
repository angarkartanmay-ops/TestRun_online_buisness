import { and, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Receipt } from "@/components/receipt";
import { pledges } from "@/lib/db/schema";
import { getDropBySlug, withLadder } from "@/lib/drops";
import { fmtDate } from "@/lib/format";
import { CURRENCY, money } from "@/lib/money";
import { pageCtx } from "@/lib/server-ctx";
import { economics } from "@/lib/settle";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return { title: `Receipt — ${(await params).slug.replace(/-/g, " ")}` };
}

export default async function ReceiptPage({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await pageCtx();
  const drop = await getDropBySlug(ctx.db, (await params).slug);
  if (!drop || !["succeeded", "failed", "canceled"].includes(drop.status)) notFound();
  const d = await withLadder(ctx.db, drop);
  const [vol] = await ctx.db
    .select({ cents: sql<number>`coalesce(sum(${pledges.chargedCents}), 0)::int`, n: sql<number>`count(*)::int` })
    .from(pledges)
    .where(and(eq(pledges.dropId, drop.id), eq(pledges.status, "charged")));
  const e = economics(drop, vol?.cents ?? 0, vol?.n ?? 0);
  const rows: [string, string][] =
    e.kind === "house"
      ? [
          ["Members who paid", String(vol?.n ?? 0)],
          ["Total paid", money(e.volume)],
          ["GST, 5% (to the government)", money(e.gst)],
          ["Payment gateway", money(e.gateway)],
          [`Club fund, ${drop.hostShareBps / 100}%`, money(e.host)],
          ["Making + delivery", money(e.cost)],
          ["QUORUM keeps", money(e.net)],
        ]
      : [
          ["Members charged", String(vol?.n ?? 0)],
          ["Total volume", money(e.volume)],
          [`To ${drop.brand} (makes the product)`, money(e.brand)],
          [`QUORUM fee, ${drop.feeBps / 100}%`, money(e.fee)],
          [`  of which: hosts, ${drop.hostShareBps / 100}%`, money(e.host)],
          ["  of which: QUORUM keeps", money(e.net)],
        ];

  return (
    <div className="mx-auto max-w-[1320px] px-4 sm:px-8 pt-10 sm:pt-14 grid gap-12 lg:grid-cols-12">
      <div className="lg:col-span-6">
        <Link href="/receipts" className="label text-ink-3 hover:text-ink">
          ← All receipts
        </Link>
        <p className="label text-ink-2 mt-8">
          {drop.brand} · closed {fmtDate(drop.closesAt)}
          {drop.practice ? <span className="text-stamp"> · practice drop, simulated members</span> : null}
        </p>
        <h1 className="display text-6xl sm:text-7xl mt-2">{drop.item}</h1>
        {drop.status === "succeeded" ? (
          <>
            <p className="mt-6 text-lg text-ink-2 max-w-[50ch]">
              Cleared at {d.members} members on tier {d.ladder.unlockedTier + 1} of {drop.tiers.length}. Every member paid {money(drop.finalPriceCents ?? 0)}, whatever price they joined at.
            </p>
            <div className="mt-10 border-t-2 border-ink">
              <p className="label text-ink-2 py-3">Where the money went — the whole drop</p>
              <dl className="divide-y divide-line border-y border-line font-mono text-sm">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2.5">
                    <dt className={k.startsWith("  ") ? "pl-4 text-ink-3" : "text-ink-2"}>{k.trim()}</dt>
                    <dd className="num">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </>
        ) : (
          <p className="mt-6 text-lg text-ink-2 max-w-[50ch]">
            {drop.status === "canceled" ? "This drop was cancelled before it closed." : `This drop reached ${d.members} of the ${drop.tiers[0]!.min} members it needed.`} Nothing was made and nobody paid a {CURRENCY === "inr" ? "rupee" : "cent"}. We publish these too, because a ladder that asks too much too early is worth learning from.
          </p>
        )}
      </div>
      <div className="lg:col-span-5 lg:col-start-8">
        {drop.receipt.length ? (
          <Receipt title={`${drop.brand} — ${drop.item}`} lines={drop.receipt} totalLabel={drop.status === "succeeded" ? "Each member paid" : "Floor price"} retailCents={drop.retailCents} footer="Published unedited" />
        ) : (
          <div className="border-2 border-dashed border-line p-8 text-ink-2">No cost sheet — this drop never ran.</div>
        )}
      </div>
    </div>
  );
}
