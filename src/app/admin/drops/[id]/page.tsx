import { and, count, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusPill } from "@/components/admin-ui";
import { DropForm } from "@/components/drop-form";
import { pledges } from "@/lib/db/schema";
import { receiptToText } from "@/lib/drop-input";
import { getDrop, isDueForSettlement, memberCount } from "@/lib/drops";
import { fmtDateTime } from "@/lib/format";
import { money } from "@/lib/money";
import { pageCtx } from "@/lib/server-ctx";
import { economics } from "@/lib/settle";
import { dropAction } from "../../actions";

export default async function EditDropPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const ctx = await pageCtx();
  const drop = await getDrop(ctx.db, (await params).id);
  if (!drop) notFound();
  const saved = (await searchParams).saved;
  const members = await memberCount(ctx.db, drop.id);
  const byStatus = await ctx.db.select({ status: pledges.status, n: count() }).from(pledges).where(eq(pledges.dropId, drop.id)).groupBy(pledges.status);
  const [vol] = await ctx.db
    .select({ cents: sql<number>`coalesce(sum(${pledges.chargedCents}), 0)::int` })
    .from(pledges)
    .where(and(eq(pledges.dropId, drop.id), eq(pledges.status, "charged")));
  const e = economics(vol?.cents ?? 0);
  const now = ctx.now();
  const due = isDueForSettlement(drop, now);
  const overdue = drop.status === "succeeded" && !drop.shippedAt && drop.shipBy <= now;
  const windowHours = Math.round((drop.closesAt.getTime() - drop.opensAt.getTime()) / 3600_000);
  const shipDays = Math.round((drop.shipBy.getTime() - drop.closesAt.getTime()) / 86400_000);

  const Op = ({ op, label, tone = "ghost", hint }: { op: string; label: string; tone?: "ghost" | "stamp"; hint: string }) => (
    <form action={dropAction} className="grid gap-1">
      <input type="hidden" name="id" value={drop.id} />
      <input type="hidden" name="op" value={op} />
      <button className={`btn btn-sm ${tone === "stamp" ? "btn-stamp" : "btn-ghost"} justify-self-start`}>{label}</button>
      <p className="text-xs text-ink-3">{hint}</p>
    </form>
  );

  return (
    <div className="grid gap-10">
      <div className="flex flex-wrap items-end gap-4 justify-between">
        <div>
          <p className="label text-ink-3">{drop.brand}</p>
          <h1 className="display text-5xl">{drop.item}</h1>
          <p className="mt-2 flex items-center gap-3 flex-wrap">
            <StatusPill status={due ? "settling" : drop.status} />
            <span className="label text-ink-3">closes {fmtDateTime(drop.closesAt)} · ships by {fmtDateTime(drop.shipBy)}</span>
            {drop.status !== "draft" ? (
              <Link href={`/drops/${drop.slug}`} className="label underline">
                View live page
              </Link>
            ) : null}
          </p>
        </div>
        {saved ? <p role="status" className="text-go font-semibold">Created.</p> : null}
      </div>

      <section className="grid gap-6 lg:grid-cols-3 border-y-2 border-ink py-6">
        <div>
          <p className="label text-ink-2 mb-2">Members</p>
          <p className="display text-5xl num">{members}</p>
          <p className="font-mono text-xs text-ink-3 mt-2">{byStatus.map((b) => `${b.status} ${b.n}`).join(" · ") || "no pledges yet"}</p>
        </div>
        <div>
          <p className="label text-ink-2 mb-2">Money (charged)</p>
          <dl className="font-mono text-sm grid gap-1">
            {[["Volume", e.volume], ["To brand", e.brand], ["Our fee", e.fee], ["Host share", e.host], ["We keep", e.net]].map(([k, val]) => (
              <div key={k as string} className="flex justify-between"><dt className="text-ink-3">{k}</dt><dd className="num">{money(val as number)}</dd></div>
            ))}
          </dl>
        </div>
        <div className="grid gap-4 content-start">
          <p className="label text-ink-2">Actions</p>
          {due ? <Op op="settle" label="Settle now" tone="stamp" hint="Capture at the final tier, or release every hold if quorum was missed." /> : null}
          {drop.status === "live" && !due ? <Op op="cancel" label="Cancel drop" hint="Releases every hold. Nobody is charged. Can't be undone." /> : null}
          {drop.status === "succeeded" && !drop.shippedAt ? <Op op="shipped" label="Mark shipped" hint="Clears it from the Bylaw 5 overdue list." /> : null}
          {drop.status === "succeeded" ? (
            <Op op="refund" label={overdue ? "Refund every member (owed)" : "Refund every member"} tone={overdue ? "stamp" : "ghost"} hint="Full refunds to every charged member. Safe to press again if any fail." />
          ) : null}
          {drop.shippedAt ? <p className="text-sm text-go">Shipped {fmtDateTime(drop.shippedAt)}</p> : null}
        </div>
      </section>

      <DropForm
        initial={{
          id: drop.id, brand: drop.brand, item: drop.item, slug: drop.slug, blurb: drop.blurb, spec: drop.spec, category: drop.category,
          glyph: drop.glyph, plate: drop.plate, imageUrl: drop.imageUrl ?? "", retail: (drop.retailCents / 100).toFixed(2), origin: drop.origin,
          opensAt: drop.opensAt.toISOString().slice(0, 16), windowHours: String(windowHours), shipDays: String(shipDays),
          resaleIndex: drop.resaleIndex == null ? "" : String(drop.resaleIndex),
          tiers: drop.tiers.map((t) => ({ min: String(t.min), price: (t.priceCents / 100).toFixed(2) })),
          receipt: receiptToText(drop.receipt), status: drop.status === "draft" ? "draft" : "live", locked: drop.status !== "draft",
        }}
      />
      <p className="text-sm text-ink-3">Price: {money(drop.tiers[0]!.priceCents)} → {money(drop.tiers[drop.tiers.length - 1]!.priceCents)} across {drop.tiers.length} tiers.</p>
    </div>
  );
}
