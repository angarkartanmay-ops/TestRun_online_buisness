import { desc } from "drizzle-orm";
import { brandApplications } from "@/lib/db/schema";
import { fmtDateTime } from "@/lib/format";
import { money } from "@/lib/money";
import { pageCtx } from "@/lib/server-ctx";
import { markBrand } from "../actions";

export default async function AdminBrands() {
  const ctx = await pageCtx();
  const rows = await ctx.db.select().from(brandApplications).orderBy(desc(brandApplications.createdAt));
  return (
    <div className="grid gap-6">
      <h1 className="display text-5xl">Brand proposals</h1>
      {rows.length === 0 ? <p className="text-ink-2">No proposals yet.</p> : null}
      <ul className="divide-y divide-line border-y border-line">
        {rows.map((b) => (
          <li key={b.id} className="py-5 grid gap-3 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="label text-ink-3">{b.email} · {fmtDateTime(b.createdAt)} · {b.status}</p>
              <p className="display text-2xl mt-1">{b.brand} — {b.item}</p>
              <p className="text-ink-2">Made: {b.factory}{b.unitCostCents != null ? ` · landed ${money(b.unitCostCents)}/unit at 300` : ""}</p>
              {b.notes ? <p className="text-ink-3 text-sm mt-1 max-w-[70ch]">{b.notes}</p> : null}
            </div>
            <div className="flex gap-2 items-start">
              {(["contacted", "declined"] as const).filter((s) => s !== b.status).map((s) => (
                <form key={s} action={markBrand}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="status" value={s} /><button className="btn btn-sm btn-ghost">Mark {s}</button></form>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
