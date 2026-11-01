import { count } from "@/lib/money";
import { desc, eq } from "drizzle-orm";
import { hostApplications, users } from "@/lib/db/schema";
import { fmtDateTime } from "@/lib/format";
import { pageCtx } from "@/lib/server-ctx";
import { reviewHost } from "../actions";

export default async function AdminHosts() {
  const ctx = await pageCtx();
  const rows = await ctx.db.select({ a: hostApplications, email: users.email }).from(hostApplications).innerJoin(users, eq(users.id, hostApplications.userId)).orderBy(desc(hostApplications.createdAt));
  return (
    <div className="grid gap-6">
      <h1 className="display text-5xl">Host applications</h1>
      {rows.length === 0 ? <p className="text-ink-2">No applications yet.</p> : null}
      <ul className="divide-y divide-line border-y border-line">
        {rows.map(({ a, email }) => (
          <li key={a.id} className="py-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <p className="label text-ink-3">{email} · {fmtDateTime(a.createdAt)} · <span className={a.status === "approved" ? "text-go" : a.status === "rejected" ? "text-stamp" : "text-warn"}>{a.status}</span></p>
              <p className="display text-2xl mt-1">{a.groupName} <span className="font-mono text-base text-ink-3">· {count(a.groupSize)} people</span></p>
              <p className="text-ink-2 mt-1 max-w-[70ch]">{a.brief}</p>
            </div>
            {a.status === "pending" ? (
              <div className="flex gap-2">
                <form action={reviewHost}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="decision" value="approve" /><button className="btn btn-sm btn-stamp">Approve</button></form>
                <form action={reviewHost}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="decision" value="reject" /><button className="btn btn-sm btn-ghost">Decline</button></form>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
