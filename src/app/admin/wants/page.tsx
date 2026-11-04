import { count, money } from "@/lib/money";
import { pageCtx } from "@/lib/server-ctx";
import { listWants } from "@/lib/wants";
import { wantStatusAction } from "@/app/wants/actions";

export default async function AdminWants() {
  const rows = await listWants(await pageCtx(), { includeHidden: true });
  return (
    <div className="grid gap-6">
      <h1 className="display text-5xl">Demand signals</h1>
      {rows.length === 0 ? <p className="text-ink-2">No requests yet.</p> : null}
      <ul className="divide-y divide-line border-y border-line">
        {rows.map((w) => (
          <li key={w.id} className="py-4 grid gap-3 lg:grid-cols-[5rem_1fr_auto] lg:items-start">
            <span className="display text-4xl text-stamp">{count(w.votes)}</span>
            <div>
              <p className="display text-2xl">{w.brand} {w.item}</p>
              <p className="label text-ink-3">{w.city} · {w.category} · {w.medianPriceCents ? `median ${money(w.medianPriceCents)} (${w.priced} priced)` : "no prices"} · <span className={w.status === "hidden" ? "text-stamp" : w.status === "answered" ? "text-go" : ""}>{w.status}</span></p>
              {w.note ? <p className="text-ink-2 mt-1">{w.note}</p> : null}
            </div>
            <form action={wantStatusAction} className="grid gap-2">
              <input type="hidden" name="id" value={w.id} />
              <input name="answer" className="field" placeholder="Reply shown to the public (optional)" defaultValue={w.answer} />
              <div className="flex gap-2">
                <button name="status" value="answered" className="btn btn-sm">Mark answered</button>
                <button name="status" value="open" className="btn btn-sm btn-ghost">Open</button>
                <button name="status" value="hidden" className="btn btn-sm btn-ghost">Hide</button>
              </div>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
