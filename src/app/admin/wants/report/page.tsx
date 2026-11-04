import { demandReport } from "@/lib/brands";
import { fmtDate } from "@/lib/format";
import { count, money } from "@/lib/money";
import { pageCtx } from "@/lib/server-ctx";

export default async function DemandReportPage({ searchParams }: { searchParams: Promise<{ brand?: string }> }) {
  const { brand } = await searchParams;
  if (!brand) return <p className="text-ink-2">Add ?brand=Name to the address.</p>;
  const r = await demandReport(await pageCtx(), brand);
  return (
    <article className="max-w-[760px] grid gap-6">
      <header>
        <p className="label text-ink-3">QUORUM demand report · {fmtDate(r.generatedAt)}</p>
        <h1 className="display text-5xl">{r.brand}</h1>
        <p className="text-ink-2 mt-2">{count(r.totalVotes)} {r.totalVotes === 1 ? "person" : "people"} across {r.requests.length} public {r.requests.length === 1 ? "request" : "requests"} say they would buy. Counts come from signed-in members; nobody has paid or committed.</p>
      </header>
      {r.requests.length === 0 ? <p className="text-ink-2">No requests name this brand yet.</p> : (
        <table className="w-full text-left">
          <thead><tr className="label text-ink-3"><th className="py-2">Item</th><th>Want it</th><th>Would pay (median)</th><th>Gave a price</th></tr></thead>
          <tbody className="divide-y divide-line">
            {r.requests.map((w) => <tr key={w.id}><td className="py-2">{w.item} <span className="label text-ink-3">· {w.city}</span></td><td>{count(w.votes)}</td><td>{w.medianPriceCents ? money(w.medianPriceCents) : "n/a"}</td><td>{w.priced}</td></tr>)}
          </tbody>
        </table>
      )}
      {r.byCity.length ? <p className="text-ink-2">By city: {r.byCity.map((c) => `${c.city} ${c.n}`).join(" · ")}</p> : null}
    </article>
  );
}
