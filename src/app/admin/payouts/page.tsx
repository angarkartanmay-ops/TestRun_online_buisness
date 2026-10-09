import { desc, eq } from "drizzle-orm";
import { drops, payouts, users } from "@/lib/db/schema";
import { money } from "@/lib/money";
import { pageCtx } from "@/lib/server-ctx";
import { markPayoutPaid } from "../actions";

export default async function AdminPayouts() {
  const ctx = await pageCtx();
  const rows = await ctx.db
    .select({ p: payouts, email: users.email, item: drops.item, shippedAt: drops.shippedAt })
    .from(payouts)
    .innerJoin(users, eq(users.id, payouts.hostUserId))
    .innerJoin(drops, eq(drops.id, payouts.dropId))
    .orderBy(desc(payouts.createdAt));
  const owed = rows.filter((r) => r.p.status === "pending").reduce((s, r) => s + r.p.amountCents, 0);
  return (
    <div className="grid gap-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h1 className="display text-5xl">Host payouts</h1>
        <p className="font-mono">Owed: <b className="num">{money(owed)}</b></p>
      </div>
      <p className="text-sm text-ink-3">Pay hosts 14 days after the drop ships, then mark paid here. (Automating this with Stripe Connect is on the launch list.)</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[44rem]">
          <thead><tr className="label text-ink-3 border-b-2 border-ink text-left"><th className="py-2 pr-4 font-medium">Host</th><th className="py-2 pr-4 font-medium">Drop</th><th className="py-2 pr-4 font-medium text-right">Members</th><th className="py-2 pr-4 font-medium text-right">Amount</th><th className="py-2 font-medium text-right">Status</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ p, email, item, shippedAt }) => (
              <tr key={p.id}>
                <td className="py-3 pr-4">{email}</td>
                <td className="py-3 pr-4">{item}</td>
                <td className="py-3 pr-4 text-right font-mono num">{p.members}</td>
                <td className="py-3 pr-4 text-right font-mono num font-bold">{money(p.amountCents)}</td>
                <td className="py-3 text-right">
                  {p.status === "pending" ? (
                    shippedAt ? (
                      <form action={markPayoutPaid}><input type="hidden" name="id" value={p.id} /><button className="btn btn-sm btn-ghost">Mark paid</button></form>
                    ) : (
                      <span className="label text-ink-3">awaiting shipment</span>
                    )
                  ) : (
                    <span className={`label ${p.status === "paid" ? "text-go" : "text-ink-3"}`}>{p.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
