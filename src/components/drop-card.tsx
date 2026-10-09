import Link from "next/link";
import type { DropWithLadder } from "@/lib/drops";
import { fmtRemaining } from "@/lib/format";
import { money, pct } from "@/lib/money";
import { Countdown } from "./countdown";
import { Ladder } from "./ladder";
import { SpecimenPlate } from "./plate";

export function plateStamp(d: Pick<DropWithLadder, "ladder" | "status">) {
  if (d.status === "succeeded") return { text: "Cleared", tone: "go" as const };
  if (d.status === "failed") return { text: "Missed quorum", tone: "mute" as const };
  if (d.status === "canceled") return { text: "Cancelled", tone: "mute" as const };
  if (d.ladder.floorReached) return { text: "Floor reached", tone: "go" as const };
  if (d.ladder.next && d.ladder.next.needed <= 10) return { text: `${d.ladder.next.needed} to go`, tone: "hot" as const };
  if (d.ladder.quorumMet) return { text: "Quorum met", tone: "go" as const };
  return null;
}

export function DropCard({ drop, now, feature = false, row = false }: { drop: DropWithLadder; now: Date; feature?: boolean; row?: boolean }) {
  const { ladder } = drop;
  const price = ladder.priceCents ?? drop.tiers[0]!.priceCents;
  return (
    <Link
      href={`/drops/${drop.slug}`}
      className={`group flex flex-col bg-receipt border border-line hover:border-ink transition-colors h-full ${feature ? "lg:flex-row" : row ? "md:flex-row" : ""}`}
    >
      <SpecimenPlate
        drop={drop}
        size={feature ? "lg" : "sm"}
        stamp={plateStamp(drop)}
        className={feature ? "aspect-[4/5] lg:aspect-auto lg:w-[52%] shrink-0" : row ? "aspect-[5/4] md:aspect-auto md:w-[42%] shrink-0" : "aspect-[5/4]"}
      />
      <div className={`flex flex-col gap-4 flex-1 ${feature ? "p-6 lg:p-8 justify-between" : "p-4"}`}>
        <div>
          <p className="label text-ink-2">{drop.brand}</p>
          <h3 className={`display mt-1.5 group-hover:text-stamp transition-colors ${feature ? "text-5xl lg:text-6xl" : "text-[1.75rem]"}`}>
            {drop.item}
          </h3>
          {feature ? <p className="mt-4 text-ink-2 max-w-[44ch]">{drop.blurb}</p> : null}
        </div>
        <div className="space-y-4">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className={`display text-stamp num ${feature ? "text-7xl" : "text-5xl"}`}>{money(price)}</span>
            <span className="font-mono text-sm text-ink-3 line-through num">{money(drop.retailCents)}</span>
            <span className="font-mono text-sm text-go num">−{pct(drop.retailCents - price, drop.retailCents)}%</span>
          </div>
          <Ladder tiers={drop.tiers} members={drop.members} unlockedTier={ladder.unlockedTier} compact={!feature} />
          <div className="flex justify-between gap-3 label text-ink-2 pt-1">
            <span className="num">{drop.members.toLocaleString("en-US")} in</span>
            {ladder.next ? (
              <span className="num text-ink">
                {ladder.next.needed} more → {money(ladder.next.priceCents)}
              </span>
            ) : (
              <span className="text-go">Lowest price</span>
            )}
            <Countdown closesAt={drop.closesAt.toISOString()} initial={fmtRemaining(drop.closesAt.getTime() - now.getTime())} />
          </div>
        </div>
      </div>
    </Link>
  );
}
