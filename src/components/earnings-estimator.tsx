"use client";

import { useState } from "react";
import { count, CURRENCY, money } from "@/lib/money";

const SYMBOL = CURRENCY === "inr" ? "₹" : CURRENCY === "gbp" ? "£" : "$";

/** Starts on realistic numbers, plainly labelled as an example. */
export function EarningsEstimator({ shareBps }: { shareBps: number }) {
  const [reach, setReach] = useState(120);
  const [rate, setRate] = useState(40);
  const [price, setPrice] = useState(899);
  const members = Math.round((reach * rate) / 100);
  const volume = members * price * 100;
  const pay = Math.round((volume * shareBps) / 10_000);

  const input = (id: string, label: string, value: number, set: (n: number) => void, opts: { min: number; max: number; step?: number; suffix?: string }) => (
    <div className="grid gap-2">
      <label htmlFor={id} className="label text-ink-2">
        {label}
      </label>
      <div className="flex items-center border-2 border-ink bg-receipt">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={opts.min}
          max={opts.max}
          step={opts.step ?? 1}
          value={value}
          onChange={(e) => set(Math.max(opts.min, Math.min(opts.max, Number(e.target.value) || 0)))}
          className="w-full bg-transparent px-3 h-12 font-mono text-lg num focus:outline-none"
        />
        {opts.suffix ? <span className="pr-3 font-mono text-ink-3">{opts.suffix}</span> : null}
      </div>
    </div>
  );

  return (
    <div className="bg-receipt border-2 border-ink p-5 sm:p-7 shadow-[8px_8px_0_var(--shadow)] grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <p className="display text-3xl">What one drop pays</p>
        <span className="stamp stamp-hot shrink-0">Example: one batch&apos;s hoodie</span>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {input("est-reach", "People in your group", reach, setReach, { min: 2, max: 5_000_000 })}
        {input("est-rate", "Share who join", rate, setRate, { min: 0, max: 100, suffix: "%" })}
        {input("est-price", "Member price", price, setPrice, { min: 1, max: 50_000, suffix: SYMBOL })}
      </div>
      <dl className="grid grid-cols-3 border-t-2 border-ink pt-5 gap-4">
        <div>
          <dt className="label text-ink-3">Members</dt>
          <dd className="display text-4xl num mt-1">{count(members)}</dd>
        </div>
        <div>
          <dt className="label text-ink-3">Drop volume</dt>
          <dd className="display text-4xl num mt-1">{money(volume)}</dd>
        </div>
        <div>
          <dt className="label text-stamp">You&apos;re paid</dt>
          <dd className="display text-4xl num mt-1 text-stamp">{money(pay)}</dd>
        </div>
      </dl>
      <p className="text-sm text-ink-3">{shareBps / 100}% of cleared volume, paid 14 days after the drop ships. Tight groups beat big audiences — a 300-person chat at 31% outsells a 1M account at 0.04%.</p>
    </div>
  );
}
