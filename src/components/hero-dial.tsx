"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { Tier } from "@/lib/db/schema";
import { money } from "@/lib/money";
import { ladderState } from "@/lib/tiers";
import { Ladder } from "./ladder";

/** The thesis, made physical: drag the group size, watch everyone's price fall. */
export function HeroDial({ tiers, retailCents, members, brand, item, slug }: { tiers: Tier[]; retailCents: number; members: number; brand: string; item: string; slug: string }) {
  const max = Math.round(tiers[tiers.length - 1]!.min * 1.2);
  const [n, setN] = useState(Math.min(members, max));
  const id = useId();
  const s = ladderState(tiers, n, -1);
  const price = s.priceCents;

  return (
    <div className="bg-receipt border-2 border-ink p-5 sm:p-7 shadow-[8px_8px_0_var(--shadow)] grid gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label text-ink-2">{brand} · live ladder</p>
          <p className="display text-3xl mt-1">{item}</p>
        </div>
        <span className="stamp stamp-hot shrink-0">Drag it</span>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="label text-ink-3">If this many of us join</p>
          <p className="display text-6xl num leading-[0.8] mt-2" aria-live="polite">
            {n.toLocaleString("en-US")}
          </p>
        </div>
        <div className="text-right">
          <p className="label text-ink-3">Everyone pays</p>
          <p key={price ?? -1} className="display text-stamp text-7xl num leading-[0.8] mt-2 rise">
            {price === null ? "—" : money(price)}
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor={id} className="sr-only">
          Number of members
        </label>
        <input
          id={id}
          type="range"
          min={1}
          max={max}
          value={n}
          onChange={(e) => setN(Number(e.target.value))}
          className="w-full accent-[var(--stamp)] h-8 cursor-grab active:cursor-grabbing"
        />
        <Ladder tiers={tiers} members={n} unlockedTier={-1} />
      </div>

      <p className="text-sm text-ink-2 min-h-[2.75rem]">
        {price === null
          ? `Under ${tiers[0]!.min} members the drop doesn't run, and nobody is charged.`
          : s.next
            ? `${s.next.needed} more and it falls to ${money(s.next.priceCents)} — for every single person in, not just the next one.`
            : `Floor price. That's the mill, the duty and everyone's cut — ${money(retailCents - price)} under retail.`}
      </p>
      <Link href={`/drops/${slug}`} className="btn btn-sm justify-self-start">
        It&apos;s live: {members.toLocaleString("en-US")} in now
      </Link>
    </div>
  );
}
