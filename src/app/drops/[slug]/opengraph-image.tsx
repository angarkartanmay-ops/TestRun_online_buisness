import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getDropBySlug, withLadder } from "@/lib/drops";
import { money } from "@/lib/money";
import { getCtx } from "@/lib/server-ctx";

export const alt = "QUORUM drop — live price";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PLATE: Record<string, string> = {
  sage: "#c3ccb2", cobalt: "#aebbe2", smoke: "#bcc0c8", mint: "#b4d7c9",
  butter: "#e7d89c", clay: "#e0b398", stone: "#cdc6b6", rust: "#d79e82",
};
const INK = "#172350";
const STAMP = "#df4429";
const GO = "#2b7350";
const PAPER = "#e7e8e1";

const fonts = Promise.all([
  readFile(join(process.cwd(), "assets/fonts/display-900.woff")),
  readFile(join(process.cwd(), "assets/fonts/mono-500.woff")),
  readFile(join(process.cwd(), "assets/fonts/mono-700.woff")),
]);

/**
 * The card a group chat shows when the link is pasted. Rendered live, so the
 * preview carries today's price and how many more people it needs.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [display, mono, monoBold] = await fonts;
  const ctx = await getCtx();
  const raw = await getDropBySlug(ctx.db, slug);
  const opts = {
    ...size,
    fonts: [
      { name: "Display", data: display, weight: 900 as const },
      { name: "Mono", data: mono, weight: 500 as const },
      { name: "Mono", data: monoBold, weight: 700 as const },
    ],
    headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
  };

  if (!raw || raw.status === "draft") {
    return new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", background: PAPER, color: INK, alignItems: "center", justifyContent: "center", fontFamily: "Display", fontSize: 140 }}>QUORUM</div>,
      opts,
    );
  }
  const d = await withLadder(ctx.db, raw);
  const price = d.finalPriceCents ?? d.ladder.priceCents ?? d.tiers[0]!.priceCents;
  const line =
    d.status === "succeeded"
      ? `Cleared at ${d.members} members`
      : d.ladder.next
        ? `${d.ladder.next.needed} more and it's ${money(d.ladder.next.priceCents)} for everyone`
        : "Lowest price reached";

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: PAPER, color: INK, fontFamily: "Mono" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 430, background: PLATE[d.plate] ?? PLATE.stone, padding: 44, borderRight: `6px solid ${INK}` }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 3, textTransform: "uppercase" }}>{d.brand}</div>
          <div style={{ display: "flex", fontFamily: "Display", fontSize: 76, lineHeight: 0.88, textTransform: "uppercase" }}>{d.item}</div>
          <div style={{ display: "flex", fontSize: 20, letterSpacing: 2, textTransform: "uppercase" }}>{d.origin.split("·")[0]}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "44px 52px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", fontFamily: "Display", fontSize: 52, textTransform: "uppercase" }}>Quorum</div>
            <div style={{ display: "flex", fontSize: 22, color: d.ladder.quorumMet ? GO : STAMP, border: `3px solid ${d.ladder.quorumMet ? GO : STAMP}`, padding: "6px 14px", letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>
              {d.members} in
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 26 }}>
            <div style={{ display: "flex", fontFamily: "Display", fontSize: 230, lineHeight: 0.8, color: STAMP }}>{money(price)}</div>
            <div style={{ display: "flex", flexDirection: "column", fontSize: 26, paddingBottom: 14 }}>
              <div style={{ display: "flex", textDecoration: "line-through", opacity: 0.55 }}>retail {money(d.retailCents)}</div>
              <div style={{ display: "flex", color: GO, fontWeight: 700 }}>−{Math.round(((d.retailCents - price) / d.retailCents) * 100)}%</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {d.tiers.map((t, i) => (
                <div key={t.min} style={{ display: "flex", flexDirection: "column", flex: 1, borderTop: `8px solid ${i <= d.ladder.unlockedTier ? GO : i === d.ladder.unlockedTier + 1 ? STAMP : "rgba(23,35,80,0.2)"}`, paddingTop: 8, fontSize: 22, color: i <= d.ladder.unlockedTier ? GO : i === d.ladder.unlockedTier + 1 ? STAMP : "rgba(23,35,80,0.5)" }}>
                  <div style={{ display: "flex", fontWeight: 700 }}>{money(t.priceCents)}</div>
                  <div style={{ display: "flex" }}>{t.min} in</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 700 }}>{line}</div>
          </div>
        </div>
      </div>
    ),
    opts,
  );
}
