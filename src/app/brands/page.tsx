import type { Metadata } from "next";
import { BrandApplyForm } from "@/components/apply-forms";
import { rules } from "@/lib/rules";

export const metadata: Metadata = { title: "Run a drop", description: "Zero inventory risk, no listing fee, paid on capture. Name your factory and hold a price at volume." };

export default function BrandsPage() {
  return (
    <div className="mx-auto max-w-[1320px] px-4 sm:px-8 pt-10 sm:pt-14 grid gap-14 lg:grid-cols-12">
      <div className="lg:col-span-6">
        <p className="label text-ink-2">For brands</p>
        <h1 className="display text-6xl sm:text-8xl mt-2">Make exactly what&apos;s already sold.</h1>
        <p className="mt-6 text-lg text-ink-2 max-w-[48ch]">
          A drop is a pre-paid order with the quantity decided before you cut a single panel. No markdown bin, no warehouse, no ad spend to find the buyers — the group brings itself.
        </p>
        <dl className="mt-10 divide-y divide-line border-y border-line">
          {[
            ["Our fee", `${rules.feeBps / 100}% of cleared volume. Nothing on a drop that misses quorum.`],
            ["Listing fee", "None."],
            ["The ladder", "You set it, we pressure-test it. Tier 1 must be reachable by one group chat — 25 members or fewer."],
            ["The ratchet", "An unlocked tier stays unlocked. Members who leave in their one-hour grace window don't re-raise the price."],
            ["Payment", "70% on capture, 30% on delivery confirmation."],
            ["Window", `${rules.defaultWindowHours} hours by default, ${rules.maxWindowHours / 24} days at most — card holds expire after 7.`],
            ["Disclosure", "Factory, city and a verified cost sheet. Published when the drop clears."],
            ["Ship-by date", "Printed on the drop. Missing it refunds every member in full."],
            ["Exclusivity", "None. Sell the same item anywhere, at any price."],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-[8rem_1fr] gap-4 py-3">
              <dt className="label text-ink-3 pt-0.5">{k}</dt>
              <dd className="text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="lg:col-span-5 lg:col-start-8 bg-receipt border-2 border-ink p-6 sm:p-8 self-start shadow-[8px_8px_0_var(--shadow)]">
        <h2 className="display text-4xl mb-6">Propose a drop</h2>
        <BrandApplyForm />
      </div>
    </div>
  );
}
