import { money } from "@/lib/money";

type Msg = { who: string; text?: string; card?: boolean; me?: boolean };

/**
 * The real distribution channel, drawn plainly. The link card is the drop's
 * actual share image, rendered live — so the preview shows today's price.
 */
export function ChatPreview({ slug, item, priceCents, nextNeeded, nextPriceCents, siteHost }: { slug: string; item: string; priceCents: number; nextNeeded: number | null; nextPriceCents: number | null; siteHost: string }) {
  const msgs: Msg[] = [
    { who: "ananya", text: `ok who's in on the ${item.toLowerCase()}` },
    { who: "ananya", card: true },
    { who: "kabir", text: nextNeeded && nextPriceCents ? `wait ${nextNeeded} more and it's ${money(nextPriceCents)} for all of us??` : `${money(priceCents)} is actually insane` },
    { who: "meher", text: "joined, M. posting it in the hostel group" },
    { who: "you", text: "in. that's one more", me: true },
  ];
  return (
    <div className="bg-paper-2 border border-line p-4 sm:p-5 grid gap-2.5 max-w-[26rem] w-full">
      <p className="label text-ink-3 text-center pb-1">batch of '27 · 6 people</p>
      {msgs.map((m, i) => (
        <div key={i} className={`flex flex-col ${m.me ? "items-end" : "items-start"}`}>
          {!m.me && (i === 0 || msgs[i - 1]!.who !== m.who) ? <span className="text-[0.6875rem] text-ink-3 px-3 mb-0.5">{m.who}</span> : null}
          {m.card ? (
            <a href={`/drops/${slug}`} className="block w-[85%] overflow-hidden rounded-[18px] border border-line bg-receipt">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/drops/${slug}/opengraph-image`} alt={`Share card for ${item}`} width={1200} height={630} className="w-full h-auto block" loading="lazy" />
              <span className="block px-3 py-2">
                <span className="block text-sm font-semibold leading-tight">{item} — QUORUM</span>
                <span className="block text-xs text-ink-3">{siteHost}</span>
              </span>
            </a>
          ) : (
            <span className={`px-3.5 py-2 rounded-[18px] max-w-[85%] text-[0.9375rem] leading-snug ${m.me ? "bg-stamp text-stamp-ink" : "bg-receipt border border-line"}`}>{m.text}</span>
          )}
        </div>
      ))}
    </div>
  );
}
