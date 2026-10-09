import type { Tier } from "@/lib/db/schema";
import { money } from "@/lib/money";
import { ladderFill } from "@/lib/tiers";

/** Equal columns, one per tier; green = unlocked, red = the next one, grey = later. */
export function Ladder({
  tiers,
  members,
  unlockedTier,
  currency = "usd",
  compact = false,
}: {
  tiers: Tier[];
  members: number;
  unlockedTier: number;
  currency?: string;
  compact?: boolean;
}) {
  const fill = ladderFill(tiers, members, unlockedTier);
  const nextIdx = unlockedTier + 1;
  return (
    <div className="space-y-1.5">
      <div
        className="ladder-track"
        role="progressbar"
        aria-label="Members toward the lowest price"
        aria-valuemin={0}
        aria-valuemax={tiers[tiers.length - 1]?.min ?? 0}
        aria-valuenow={members}
      >
        <div className="ladder-fill" style={{ transform: `scaleX(${fill})` }} />
      </div>
      <ol className="grid" style={{ gridTemplateColumns: `repeat(${tiers.length}, minmax(0, 1fr))` }}>
        {tiers.map((t, i) => {
          const tone = i <= unlockedTier ? "text-go border-go" : i === nextIdx ? "text-stamp border-stamp" : "text-ink-3 border-line";
          return (
            <li key={t.min} className={`border-t-2 pt-1 text-right font-mono num ${tone} ${compact ? "text-[0.6875rem]" : "text-xs"}`}>
              <b className="block font-bold">{money(t.priceCents, currency)}</b>
              <span className="opacity-80">{t.min} in</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
