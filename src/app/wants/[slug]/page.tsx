import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { count, money } from "@/lib/money";
import { pageCtx } from "@/lib/server-ctx";
import { getSessionUser } from "@/lib/session";
import { getWant, WANT_CITIES } from "@/lib/wants";
import { voteAction } from "../actions";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const w = await getWant(await pageCtx(), slug);
  return w && w.status !== "hidden" ? { title: `${w.brand} ${w.item}: ${w.votes} want it` } : { title: "Not found" };
}

export default async function WantPage({ params }: Props) {
  const { slug } = await params;
  const user = await getSessionUser();
  const w = await getWant(await pageCtx(), slug, user?.id);
  if (!w || w.status === "hidden") notFound();
  return (
    <div className="mx-auto max-w-[1320px] px-4 sm:px-8 pt-10 sm:pt-14 grid gap-10 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <Link href="/wants" className="label text-ink-2">← Demand board</Link>
        <p className="label text-ink-3 mt-6">{w.city} · {w.category}</p>
        <h1 className="display text-5xl sm:text-7xl mt-2">{w.brand} {w.item}</h1>
        {w.note ? <p className="mt-4 text-ink-2 max-w-[56ch]">{w.note}</p> : null}
        {w.answer ? (
          <div className="mt-6 border-2 border-ink bg-receipt p-4 max-w-[56ch]">
            <p className="label text-go">Reply</p>
            <p className="mt-1">{w.answer}</p>
          </div>
        ) : null}
        <dl className="mt-8 grid grid-cols-3 gap-4 max-w-[34rem]">
          <div><dt className="label text-ink-3">Want it</dt><dd className="display text-5xl text-stamp">{count(w.votes)}</dd></div>
          <div><dt className="label text-ink-3">Would pay</dt><dd className="display text-4xl">{w.medianPriceCents ? money(w.medianPriceCents) : "—"}</dd><dd className="label text-ink-3">{w.priced} gave a price</dd></div>
          <div><dt className="label text-ink-3">Top city</dt><dd className="display text-2xl sm:text-3xl break-words">{w.byCity[0]?.city ?? "—"}</dd></div>
        </dl>
        <ul className="mt-6 flex flex-wrap gap-2">
          {w.byCity.map((c) => <li key={c.city} className="label border border-line px-2 py-1">{c.city} · {c.n}</li>)}
        </ul>
      </div>
      <div className="lg:col-span-4 lg:col-start-9 bg-receipt border-2 border-ink p-6 self-start shadow-[8px_8px_0_var(--shadow)]">
        <h2 className="display text-3xl mb-4">{w.mine ? "You're counted" : "I'd buy this"}</h2>
        <form action={voteAction} className="grid gap-4">
          <input type="hidden" name="wantId" value={w.id} />
          <input type="hidden" name="slug" value={w.slug} />
          {w.mine ? null : (
            <>
              <label className="grid gap-2"><span className="label text-ink-2">Your city</span>
                <select name="city" className="field" defaultValue={WANT_CITIES.includes(w.city as never) ? w.city : "Bengaluru"}>{WANT_CITIES.map((c) => <option key={c}>{c}</option>)}</select>
              </label>
              <label className="grid gap-2"><span className="label text-ink-2">Most you&apos;d pay, ₹ (optional)</span>
                <input name="maxPrice" type="number" inputMode="numeric" className="field" />
              </label>
            </>
          )}
          <button className={`btn ${w.mine ? "btn-ghost" : "btn-stamp"} justify-self-start`}>{w.mine ? "Take me off" : user ? "Count me in" : "Sign in to count"}</button>
        </form>
        <p className="mt-4 text-sm text-ink-3">Free and non-binding. If a brand agrees to a group price you&apos;ll be told first, and you choose then.</p>
      </div>
    </div>
  );
}
