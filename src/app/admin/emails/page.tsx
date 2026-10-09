import { desc } from "drizzle-orm";
import { emailLog } from "@/lib/db/schema";
import { fmtDateTime } from "@/lib/format";
import { pageCtx } from "@/lib/server-ctx";

export default async function AdminEmails() {
  const ctx = await pageCtx();
  const rows = await ctx.db.select().from(emailLog).orderBy(desc(emailLog.createdAt)).limit(200);
  return (
    <div className="grid gap-6">
      <h1 className="display text-5xl">Email log</h1>
      <p className="text-sm text-ink-3">Subjects only — message bodies (which can contain sign-in codes) are never stored. &ldquo;logged&rdquo; means no email provider is configured and it went to the server log.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[44rem]">
          <thead><tr className="label text-ink-3 border-b-2 border-ink text-left"><th className="py-2 pr-4 font-medium">When</th><th className="py-2 pr-4 font-medium">To</th><th className="py-2 pr-4 font-medium">Subject</th><th className="py-2 font-medium">Status</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="py-2.5 pr-4 font-mono text-xs text-ink-3 whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
                <td className="py-2.5 pr-4">{r.to}</td>
                <td className="py-2.5 pr-4">{r.kind === "login_code" ? "Sign-in code" : r.subject}</td>
                <td className={`py-2.5 label ${r.status === "sent" ? "text-go" : r.status === "failed" ? "text-stamp" : "text-ink-3"}`} title={r.error ?? undefined}>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
