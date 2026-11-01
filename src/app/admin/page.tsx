import { and, desc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { StatusPill } from "@/components/admin-ui";
import { config, modes } from "@/lib/config";
import { drops, pledges } from "@/lib/db/schema";
import { isDueForSettlement, memberCounts } from "@/lib/drops";
import { fmtDateTime } from "@/lib/format";
import { money } from "@/lib/money";
import { pageCtx } from "@/lib/server-ctx";
import { economics, overdueDrops } from "@/lib/settle";
import { ladderState } from "@/lib/tiers";
import { refreshPractice, settleAllDue } from "./actions";

const median = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : Math.round((s[m - 1]! + s[m]!) / 2);
};

/**
 * The decision gate from the pilot plan, computed from real (non-practice) drops:
 * continue only if all five pass after five campus drops.
 */
async function pilotGate(ctx: Awaited<ReturnType<typeof pageCtx>>) {
  const closed = await ctx.db
    .select()
    .from(drops)
    .where(and(eq(drops.practice, false), inArray(drops.status, ["succeeded", "failed"])));
  const ids = closed.map((d) => d.id);
  const tallies = ids.length
    ? await ctx.db
        .select({
          dropId: pledges.dropId,
          paid: sql<number>`count(*) filter (where ${pledges.status} = 'charged')::int`,
          paidCents: sql<number>`coalesce(sum(${pledges.chargedCents}) filter (where ${pledges.status} = 'charged'), 0)::int`,
          owed: sql<number>`count(*) filter (where ${pledges.status} = 'awaiting_payment' or (${pledges.status} = 'failed' and ${pledges.releaseReason} = 'unpaid'))::int`,
        })
        .from(pledges)
        .where(inArray(pledges.dropId, ids))
        .groupBy(pledges.dropId)
    : [];
  const by = new Map(tallies.map((t) => [t.dropId, t]));
  const cleared = closed.filter((d) => d.status === "succeeded");
  const units = cleared.map((d) => by.get(d.id)?.paid ?? 0);
  const paid = cleared.reduce((s, d) => s + (by.get(d.id)?.paid ?? 0), 0);
  const asked = cleared.reduce((s, d) => s + (by.get(d.id)?.paid ?? 0) + (by.get(d.id)?.owed ?? 0), 0);
  const house = cleared.filter((d) => d.kind === "house");
  const perUnit = house.length
    ? Math.round(
        house.reduce((s, d) => s + economics(d, by.get(d.id)?.paidCents ?? 0, by.get(d.id)?.paid ?? 0).net, 0) /
          Math.max(1, house.reduce((s, d) => s + (by.get(d.id)?.paid ?? 0), 0)),
      )
    : 0;
  const hostDrops = new Map<string, number>();
  for (const d of closed) if (d.hostUserId) hostDrops.set(d.hostUserId, (hostDrops.get(d.hostUserId) ?? 0) + 1);
  const repeatHosts = [...hostDrops.values()].filter((n) => n >= 2).length;
  return [
    { label: "Drops that cleared", value: `${cleared.length} of ${closed.length}`, pass: closed.length >= 5 && cleared.length >= 3, target: "≥ 3 of 5" },
    { label: "Median units per cleared drop", value: String(median(units)), pass: cleared.length > 0 && median(units) >= 25, target: "≥ 25" },
    { label: "Members who paid", value: asked ? `${Math.round((paid / asked) * 100)}%` : "—", pass: asked > 0 && paid / asked >= 0.7, target: "≥ 70%" },
    { label: "Contribution per unit", value: house.length ? money(perUnit) : "—", pass: house.length > 0 && perUnit >= 8000, target: `≥ ${money(8000)}` },
    { label: "Hosts with a second drop", value: String(repeatHosts), pass: repeatHosts >= 2, target: "≥ 2" },
  ];
}

export default async function AdminHome() {
  const ctx = await pageCtx();
  const rows = await ctx.db.select().from(drops).where(inArray(drops.status, ["draft", "live", "settling", "succeeded", "failed", "canceled"])).orderBy(desc(drops.closesAt));
  const counts = await memberCounts(ctx.db, rows.map((r) => r.id));
  const overdue = await overdueDrops(ctx);
  const due = rows.filter((d) => isDueForSettlement(d, ctx.now()));
  const now = ctx.now();
  const gate = await pilotGate(ctx);
  const payMode =
    modes.payments === "stripe"
      ? "Card holds (Stripe)"
      : modes.payments === "commit"
        ? `Pay after close — ${config.razorpayKeyId ? "Razorpay links" : ""}${config.razorpayKeyId && config.upiVpa ? " + " : ""}${config.upiVpa ? `UPI to ${config.upiVpa}` : ""}`
        : "Practice only — nobody pays (set UPI_VPA or Razorpay keys to take payments)";

  return (
    <div className="grid gap-10">
      <section className="grid gap-4 border-2 border-ink p-5 bg-receipt">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="display text-3xl">Pilot gate</h2>
          <p className="label text-ink-3">Real drops only · payments: {payMode}</p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-5">
          {gate.map((g) => (
            <div key={g.label}>
              <dt className="label text-ink-3">{g.label}</dt>
              <dd className={`display text-3xl num mt-1 ${g.pass ? "text-go" : ""}`}>{g.value}</dd>
              <p className="label text-ink-3 mt-1">target {g.target}</p>
            </div>
          ))}
        </dl>
        <p className="text-sm text-ink-2">
          {gate.every((g) => g.pass) ? "All five pass — the plan says register, switch on Razorpay mandates and scale." : "Run five real campus drops, then decide. Continue only if all five pass."}
        </p>
      </section>

      {overdue.length ? (
        <div role="alert" className="border-2 border-stamp bg-stamp-soft p-4 grid gap-2">
          <p className="display text-2xl text-stamp">Bylaw 5: {overdue.length} cleared drop{overdue.length > 1 ? "s are" : " is"} past ship-by</p>
          <ul className="text-sm">
            {overdue.map((d) => (
              <li key={d.id}>
                <Link href={`/admin/drops/${d.id}`} className="underline">
                  {d.brand} {d.item}
                </Link>{" "}
                — mark shipped, or refund every member.
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/drops/new" className="btn btn-stamp btn-sm">
          New drop
        </Link>
        <form action={settleAllDue}>
          <button className="btn btn-sm btn-ghost" disabled={due.length === 0}>
            Settle {due.length} overdue drop{due.length === 1 ? "" : "s"} now
          </button>
        </form>
        <form action={refreshPractice}>
          <button className="btn btn-sm btn-ghost">Refresh practice drops</button>
        </form>
        <p className="text-sm text-ink-3">Drops also settle on the first page view after closing, and in the daily cron sweep.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[52rem]">
          <thead>
            <tr className="label text-ink-3 border-b-2 border-ink text-left">
              <th className="py-2 pr-4 font-medium">Drop</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 pr-4 font-medium text-right">Members</th>
              <th className="py-2 pr-4 font-medium text-right">Price now</th>
              <th className="py-2 pr-4 font-medium text-right">Volume at this price</th>
              <th className="py-2 font-medium text-right">Closes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((d) => {
              const m = counts.get(d.id) ?? 0;
              const l = ladderState(d.tiers, m, d.unlockedTier);
              const price = d.finalPriceCents ?? l.priceCents;
              return (
                <tr key={d.id} className="hover:bg-paper-2">
                  <td className="py-3 pr-4">
                    <Link href={`/admin/drops/${d.id}`} className="hover:text-stamp">
                      <span className="label text-ink-3 block">
                        {d.brand}
                        {d.practice ? <span className="text-stamp"> · practice</span> : null}
                      </span>
                      <span className="font-semibold">{d.item}</span>
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusPill status={isDueForSettlement(d, now) ? "settling" : d.status} />
                  </td>
                  <td className="py-3 pr-4 text-right font-mono num">{m}</td>
                  <td className="py-3 pr-4 text-right font-mono num">{price === null ? "below quorum" : money(price)}</td>
                  <td className="py-3 pr-4 text-right font-mono num">{price === null ? "—" : money(price * m)}</td>
                  <td className="py-3 text-right font-mono num text-ink-2">{fmtDateTime(d.closesAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
