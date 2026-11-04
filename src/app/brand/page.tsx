import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { brandDemand, brandDrops, brandForUser } from "@/lib/brands";
import { count, money } from "@/lib/money";
import { getCtx, pageCtx } from "@/lib/server-ctx";
import { getSessionUser } from "@/lib/session";
import { brandReplyAction } from "./actions";

export const metadata: Metadata = { title: "Brand dashboard", robots: { index: false } };

export default async function BrandDashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/brand");
  const ctx = await pageCtx();
  const brand = await brandForUser(await getCtx(), user.id);
  if (!brand || brand.status !== "approved") {
    return (
      <div className="mx-auto max-w-[640px] px-4 sm:px-8 pt-14">
        <h1 className="display text-5xl">No brand account yet</h1>
        <p className="mt-4 text-ink-2">Propose a drop and we&apos;ll set up your brand account once we&apos;ve agreed terms. Use the same email you sign in with.</p>
        <Link href="/brands" className="btn btn-stamp mt-6">Propose a drop</Link>
      </div>
    );
  }
  const [demand, ownDrops] = await Promise.all([brandDemand(ctx, brand.name), brandDrops(ctx, brand.name)]);
  const total = demand.reduce((n, w) => n + w.votes, 0);
  return (
    <div className="mx-auto max-w-[1320px] px-4 sm:px-8 pt-10 sm:pt-14 grid gap-10">
      <header>
        <p className="label text-ink-2">Brand dashboard</p>
        <h1 className="display text-6xl sm:text-8xl mt-2">{brand.name}</h1>
        <p className="mt-3 text-ink-2">{count(total)} people across {demand.length} requests want your products. Nothing here is a sale: it is demand you can answer with a drop.</p>
      </header>
      <section aria-labelledby="demand">
        <h2 id="demand" className="display text-3xl mb-3">Demand for {brand.name}</h2>
        {demand.length === 0 ? <p className="text-ink-2">No requests name your brand yet. They appear here as people ask for your products.</p> : null}
        <ul className="divide-y divide-line border-y border-line">
          {demand.map((w) => (
            <li key={w.id} className="py-4 grid gap-3 lg:grid-cols-[5rem_1fr_minmax(0,24rem)] lg:items-start">
              <span className="display text-4xl text-stamp">{count(w.votes)}</span>
              <div>
                <Link href={`/wants/${w.slug}`} className="display text-2xl">{w.item}</Link>
                <p className="label text-ink-3">{w.city} · {w.medianPriceCents ? `would pay ~${money(w.medianPriceCents)} (${w.priced} gave a price)` : "no prices given"}</p>
                {w.note ? <p className="text-ink-2 mt-1">{w.note}</p> : null}
              </div>
              <form action={brandReplyAction} className="grid gap-2">
                <input type="hidden" name="wantId" value={w.id} />
                <input name="answer" className="field" defaultValue={w.answer} placeholder="Public reply, e.g. when you could run a drop" maxLength={600} />
                <button className="btn btn-sm justify-self-start">{w.answer ? "Update reply" : "Reply publicly"}</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="drops">
        <h2 id="drops" className="display text-3xl mb-3">Your drops</h2>
        {ownDrops.length === 0 ? <p className="text-ink-2">None yet. When you want to answer demand with a drop, email us and we&apos;ll set the ladder up with you.</p> : (
          <ul className="divide-y divide-line border-y border-line">
            {ownDrops.map((d) => (
              <li key={d.id} className="py-3 flex justify-between gap-4"><Link href={`/${d.status === "live" ? "drops" : "receipts"}/${d.slug}`} className="display text-xl">{d.item}</Link><span className="label text-ink-3">{d.status}</span></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
