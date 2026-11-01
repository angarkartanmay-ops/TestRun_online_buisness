import { and, count, eq, inArray, isNotNull, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusPill } from "@/components/admin-ui";
import { DropForm } from "@/components/drop-form";
import { payStyle } from "@/lib/config";
import { pledges, users } from "@/lib/db/schema";
import { receiptToText } from "@/lib/drop-input";
import { getDrop, isDueForSettlement, memberCount } from "@/lib/drops";
import { fmtDateTime } from "@/lib/format";
import { money, pct } from "@/lib/money";
import { pageCtx } from "@/lib/server-ctx";
import { economics } from "@/lib/settle";
import { payRef } from "@/lib/upi";
import { dropAction, pledgeAction } from "../../actions";

export default async function EditDropPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const ctx = await pageCtx();
  const drop = await getDrop(ctx.db, (await params).id);
  if (!drop) notFound();
  const saved = (await searchParams).saved;
  const members = await memberCount(ctx.db, drop.id);
  const byStatus = await ctx.db.select({ status: pledges.status, n: count() }).from(pledges).where(eq(pledges.dropId, drop.id)).groupBy(pledges.status);
  const n = (...statuses: string[]) => byStatus.filter((b) => statuses.includes(b.status)).reduce((s, b) => s + b.n, 0);
  const [vol] = await ctx.db
    .select({ cents: sql<number>`coalesce(sum(${pledges.chargedCents}), 0)::int`, n: sql<number>`count(*)::int` })
    .from(pledges)
    .where(and(eq(pledges.dropId, drop.id), eq(pledges.status, "charged")));
  const [crew] = await ctx.db
    .select({ n: count() })
    .from(pledges)
    .where(and(eq(pledges.dropId, drop.id), isNotNull(pledges.referrerId), inArray(pledges.status, ["held", "capturing", "awaiting_payment", "charged"])));
  const sizes = await ctx.db
    .select({ size: pledges.size, n: count() })
    .from(pledges)
    .where(and(eq(pledges.dropId, drop.id), inArray(pledges.status, ["held", "capturing", "awaiting_payment", "charged"])))
    .groupBy(pledges.size);
  const owing = await ctx.db
    .select({ id: pledges.id, email: users.email, size: pledges.size, cents: pledges.chargedCents, claimed: pledges.paidClaimedAt, payUrl: pledges.payUrl, payBy: pledges.payBy })
    .from(pledges)
    .innerJoin(users, eq(users.id, pledges.userId))
    .where(and(eq(pledges.dropId, drop.id), eq(pledges.status, "awaiting_payment")))
    .orderBy(pledges.createdAt);

  const e = economics(drop, vol?.cents ?? 0, vol?.n ?? 0);
  const now = ctx.now();
  const due = isDueForSettlement(drop, now);
  const overdue = drop.status === "succeeded" && !drop.shippedAt && drop.shipBy <= now;
  const windowHours = Math.round((drop.closesAt.getTime() - drop.opensAt.getTime()) / 3600_000);
  const shipDays = Math.round((drop.shipBy.getTime() - drop.closesAt.getTime()) / 86400_000);
  const card = payStyle === "card" && !drop.practice;
  const joined = byStatus.reduce((s, b) => s + b.n, 0);
  const paid = n("charged");
  const owed = n("awaiting_payment");
  const unpaid = n("failed");
  const sizeOrder = [...drop.sizes, null];
  const sizeRows = sizes.sort((a, b) => sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size));

  const Op = ({ op, label, tone = "ghost", hint }: { op: string; label: string; tone?: "ghost" | "stamp"; hint: string }) => (
    <form action={dropAction} className="grid gap-1">
      <input type="hidden" name="id" value={drop.id} />
      <input type="hidden" name="op" value={op} />
      <button className={`btn btn-sm ${tone === "stamp" ? "btn-stamp" : "btn-ghost"} justify-self-start`}>{label}</button>
      <p className="text-xs text-ink-3">{hint}</p>
    </form>
  );

  const money$ =
    e.kind === "house"
      ? ([["Paid", e.volume], ["GST (5%)", e.gst], ["Gateway", e.gateway], ["Club fund", e.host], ["Making + delivery", e.cost], ["We keep", e.net], ["Per unit", e.perUnit]] as const)
      : ([["Volume", e.volume], ["To brand", e.brand], ["Our fee", e.fee], ["Host share", e.host], ["We keep", e.net]] as const);

  return (
    <div className="grid gap-10">
      <div className="flex flex-wrap items-end gap-4 justify-between">
        <div>
          <p className="label text-ink-3">
            {drop.brand} · {drop.kind === "house" ? "house drop" : "partner drop"}
            {drop.practice ? <span className="text-stamp"> · practice</span> : null}
          </p>
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

      <section className="grid gap-6 lg:grid-cols-4 border-y-2 border-ink py-6">
        <div>
          <p className="label text-ink-2 mb-2">Pilot funnel</p>
          <dl className="font-mono text-sm grid gap-1">
            {(
              [
                ["Page views", drop.views, null],
                ["Joined", joined, drop.views ? `${pct(joined, drop.views)}% of views` : null],
                ["Counted", members, null],
                ["From crew links", crew?.n ?? 0, members ? `${pct(crew?.n ?? 0, members)}%` : null],
                ["Paid", paid, members ? `${pct(paid, members)}%` : null],
                ["Still owe", owed, null],
                ["Didn't pay", unpaid, null],
              ] as [string, number, string | null][]
            ).map(([k, v, note]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-ink-3">{k}</dt>
                <dd className="num">
                  {v}
                  {note ? <span className="text-ink-3"> · {note}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <p className="label text-ink-2 mb-2">Order sheet (counted members)</p>
          {sizeRows.length ? (
            <dl className="font-mono text-sm grid gap-1">
              {sizeRows.map((r) => (
                <div key={r.size ?? "one"} className="flex justify-between">
                  <dt className="text-ink-3">{r.size ?? "One size"}</dt>
                  <dd className="num">{r.n}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-ink-3">No members yet.</p>
          )}
        </div>
        <div>
          <p className="label text-ink-2 mb-2">Money (paid)</p>
          <dl className="font-mono text-sm grid gap-1">
            {money$.map(([k, val]) => (
              <div key={k} className="flex justify-between">
                <dt className="text-ink-3">{k}</dt>
                <dd className="num">{money(val)}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="grid gap-4 content-start">
          <p className="label text-ink-2">Actions</p>
          {due ? (
            <Op
              op="settle"
              label="Settle now"
              tone="stamp"
              hint={card ? "Capture at the final tier, or release every hold if quorum was missed." : "Fix the final price and send everyone their payment link — or close it if quorum was missed."}
            />
          ) : null}
          {drop.status === "live" && !due ? <Op op="cancel" label="Cancel drop" hint={card ? "Releases every hold. Nobody is charged. Can't be undone." : "Nobody pays. Can't be undone."} /> : null}
          {drop.status === "succeeded" && owed > 0 ? (
            <Op op="close_collection" label={`Close payments (${owed} unpaid)`} hint="Releases everyone who hasn't paid, then records the club fund payout on what was paid." />
          ) : null}
          {drop.status === "succeeded" && !drop.shippedAt ? <Op op="shipped" label="Mark shipped" hint="Clears it from the Bylaw 5 overdue list." /> : null}
          {drop.status === "succeeded" ? (
            <Op
              op="refund"
              label={overdue ? "Refund every member (owed)" : "Refund every member"}
              tone={overdue ? "stamp" : "ghost"}
              hint={card ? "Full refunds to every charged member. Safe to press again if any fail." : "Marks every paid member refunded. Send each one their money back by UPI first."}
            />
          ) : null}
          {drop.shippedAt ? <p className="text-sm text-go">Shipped {fmtDateTime(drop.shippedAt)}</p> : null}
        </div>
      </section>

      {owing.length ? (
        <section className="grid gap-3">
          <h2 className="display text-3xl">Waiting on payment · {owing.length}</h2>
          <p className="text-sm text-ink-2 max-w-[70ch]">
            Match each UPI payment in your bank app by its note, then mark it paid — the member gets a receipt email. &ldquo;Says paid&rdquo; means they tapped &ldquo;I&apos;ve paid&rdquo;: check before you confirm.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[44rem]">
              <thead>
                <tr className="label text-ink-3 border-b-2 border-ink text-left">
                  <th className="py-2 pr-4 font-medium">Member</th>
                  <th className="py-2 pr-4 font-medium">Size</th>
                  <th className="py-2 pr-4 font-medium">UPI note</th>
                  <th className="py-2 pr-4 font-medium text-right">Owes</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {owing.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-4 font-mono">{p.email}</td>
                    <td className="py-2 pr-4 font-mono">{p.size ?? "—"}</td>
                    <td className="py-2 pr-4 font-mono select-all">{payRef(p.id)}</td>
                    <td className="py-2 pr-4 font-mono num text-right">{money(p.cents ?? 0)}</td>
                    <td className="py-2 pr-4">{p.claimed ? <span className="text-warn font-semibold">Says paid</span> : <span className="text-ink-3">Waiting</span>}</td>
                    <td className="py-2 text-right">
                      <form action={pledgeAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="dropId" value={drop.id} />
                        <input type="hidden" name="op" value="paid" />
                        <button className="btn btn-sm">Mark paid</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <DropForm
        initial={{
          id: drop.id, brand: drop.brand, item: drop.item, slug: drop.slug, blurb: drop.blurb, spec: drop.spec, category: drop.category,
          glyph: drop.glyph, plate: drop.plate, imageUrl: drop.imageUrl ?? "", retail: (drop.retailCents / 100).toFixed(2), origin: drop.origin,
          opensAt: drop.opensAt.toISOString().slice(0, 16), windowHours: String(windowHours), shipDays: String(shipDays),
          resaleIndex: drop.resaleIndex == null ? "" : String(drop.resaleIndex),
          tiers: drop.tiers.map((t) => ({ min: String(t.min), price: (t.priceCents / 100).toFixed(2), cost: t.costCents == null ? "" : (t.costCents / 100).toFixed(2) })),
          receipt: receiptToText(drop.receipt), status: drop.status === "draft" ? "draft" : "live", locked: drop.status !== "draft",
          kind: drop.kind, hostShare: String(drop.hostShareBps / 100), sizes: drop.sizes.join(", "), countryOfOrigin: drop.countryOfOrigin,
          practice: drop.practice,
        }}
      />
      <p className="text-sm text-ink-3">Price: {money(drop.tiers[0]!.priceCents)} → {money(drop.tiers[drop.tiers.length - 1]!.priceCents)} across {drop.tiers.length} tiers.</p>
    </div>
  );
}
