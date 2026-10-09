import { desc, inArray } from "drizzle-orm";
import Link from "next/link";
import { StatusPill } from "@/components/admin-ui";
import { drops } from "@/lib/db/schema";
import { isDueForSettlement, memberCounts } from "@/lib/drops";
import { fmtDateTime } from "@/lib/format";
import { money } from "@/lib/money";
import { pageCtx } from "@/lib/server-ctx";
import { overdueDrops } from "@/lib/settle";
import { ladderState } from "@/lib/tiers";
import { settleAllDue } from "./actions";

export default async function AdminHome() {
  const ctx = await pageCtx();
  const rows = await ctx.db.select().from(drops).where(inArray(drops.status, ["draft", "live", "settling", "succeeded", "failed", "canceled"])).orderBy(desc(drops.closesAt));
  const counts = await memberCounts(ctx.db, rows.map((r) => r.id));
  const overdue = await overdueDrops(ctx);
  const due = rows.filter((d) => isDueForSettlement(d, ctx.now()));
  const now = ctx.now();

  return (
    <div className="grid gap-10">
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
              <th className="py-2 pr-4 font-medium text-right">Held volume</th>
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
                      <span className="label text-ink-3 block">{d.brand}</span>
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
