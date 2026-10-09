import { ArrowRight, Factory, HandCoins, Lock, Receipt as ReceiptIcon, TrendDown, UsersThree } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { ChatPreview } from "@/components/chat-preview";
import { DropCard } from "@/components/drop-card";
import { HeroDial } from "@/components/hero-dial";
import { Receipt } from "@/components/receipt";
import { config } from "@/lib/config";
import { listDrops } from "@/lib/drops";
import { money } from "@/lib/money";
import { rules } from "@/lib/rules";
import { pageCtx } from "@/lib/server-ctx";
import { unionStats } from "@/lib/stats";

const BYLAWS: [string, string][] = [
  ["The price only falls.", "Once a tier unlocks it can't re-lock. If people leave, the price you were promised stays."],
  ["No quorum, no drop.", "Below the first tier nothing is made and every hold is released. Scarcity here is arithmetic, not marketing."],
  ["Every drop names its factory.", "Mill, city, country — on the drop. If a brand won't name the maker, the drop doesn't run."],
  ["8%, shown as 8%.", "Our fee is a line on the receipt. Nothing hidden in shipping, handling or currency spread."],
  ["Ships by the date, or a full refund.", "Every drop prints a ship-by date. Miss it and you're refunded without asking."],
  ["Membership is free, forever.", "No subscription, no paid tier, no early access. We earn only when a drop clears."],
];

const FAQ: [string, string][] = [
  ["When am I actually charged?", "When the drop closes. Joining places a hold on your card at the current price — the most you can pay. At close we charge the final price, which is equal or lower, and your bank releases the rest. Join at $41, close at $23: you pay $23."],
  ["What if the drop misses quorum?", "Every hold is released, nothing is made, and we email you. You're never charged for a drop that didn't run."],
  ["Can I change my mind?", `Yes, freely, until the drop reaches quorum — and for ${rules.leaveGraceMinutes} minutes after you join. After that your spot is part of what's holding everyone's price down, so you're locked in.`],
  ["Why does it take weeks to ship?", "Because nothing exists until the drop clears — that's why there's no unsold stock to pay for. Each drop prints its ship-by date. If we miss it, you get a full refund without asking."],
  ["Why is a drop so short?", `Card holds expire after 7 days, so drops run ${rules.defaultWindowHours} hours by default and never more than ${rules.maxWindowHours / 24} days. Short windows also keep it a group decision, not a background tab.`],
  ["Do you read my group chat?", "No. There's no bot and no integration. Your link carries a short code; we count the code. Your chat stays your chat."],
];

export default async function Home() {
  const ctx = await pageCtx();
  const [live, cleared, stats] = await Promise.all([listDrops(ctx.db, ["live"]), listDrops(ctx.db, ["succeeded"]), unionStats(ctx.db)]);
  const now = ctx.now();
  const featured = live.find((d) => d.ladder.next && d.ladder.quorumMet) ?? live[0];
  const chatDrop = live.find((d) => d.slug.includes("tee")) ?? featured;
  const receipt = cleared.find((d) => d.receipt.length > 0);
  const tickerItems = live.map((d) => `${d.brand} · ${d.members} in · ${money(d.ladder.priceCents ?? d.tiers[0]!.priceCents)}`);

  return (
    <>
      {/* HERO — the mechanic, not a pitch */}
      <section className="mx-auto max-w-[1320px] px-4 sm:px-8 pt-10 sm:pt-16 pb-14 grid gap-12 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-7 lg:pt-6">
          <p className="label text-ink-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-stamp" aria-hidden /> A buyers&apos; union · prices set by the group
          </p>
          <h1 className="display mt-5 text-[3.25rem] sm:text-[5rem] xl:text-[6.25rem]">
            <span className="block">Alone you pay retail.</span> <span className="block text-stamp">Together you pay the mill.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-ink-2 max-w-[52ch] leading-relaxed">
            Pick a drop. Bring the group chat. Every person who joins pushes the price down for everyone — including the people who joined first. Then we publish the whole receipt.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/drops" className="btn btn-stamp">
              See {stats.live} open drops <ArrowRight weight="bold" size={20} />
            </Link>
            <Link href="#how" className="btn btn-ghost">
              How a drop works
            </Link>
          </div>
          <dl className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-y-6 border-t border-line pt-6">
            {[
              ["Members", stats.members.toLocaleString("en-US")],
              ["Drops cleared", String(stats.cleared)],
              ["Avg. kept / order", money(stats.avgKeptCents)],
              ["Our cut", `${rules.feeBps / 100}%`],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="label text-ink-3">{k}</dt>
                <dd className="display text-4xl mt-1.5 num">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        {featured ? (
          <div className="lg:col-span-5">
            <HeroDial tiers={featured.tiers} retailCents={featured.retailCents} members={featured.members} brand={featured.brand} item={featured.item} slug={featured.slug} />
          </div>
        ) : null}
      </section>

      {/* TICKER */}
      {tickerItems.length ? (
        <div className="border-y-2 border-ink bg-ink text-paper overflow-hidden" aria-hidden>
          <div className="marquee py-2.5">
            {[...tickerItems, ...tickerItems].map((t, i) => (
              <span key={i} className="label px-8 whitespace-nowrap">
                {t}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* OPEN NOW — horizontal rail */}
      <section className="py-16 sm:py-20" aria-labelledby="open-now">
        <div className="mx-auto max-w-[1320px] px-4 sm:px-8 flex items-end justify-between gap-6 mb-8">
          <div>
            <p className="label text-ink-2">Open now · prices move as you read</p>
            <h2 id="open-now" className="display text-5xl sm:text-6xl mt-2">
              The board
            </h2>
          </div>
          <Link href="/drops" className="label text-ink-2 hover:text-stamp inline-flex items-center gap-1.5 shrink-0">
            All drops <ArrowRight size={14} />
          </Link>
        </div>
        <div className="rail overflow-x-auto">
          <div className="flex gap-5 px-4 sm:px-8 pb-2 w-max mx-auto max-w-none">
            {live.slice(0, 6).map((d) => (
              <div key={d.id} className="w-[19rem] sm:w-[21rem] shrink-0">
                <DropCard drop={d} now={now} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW — a real sequence, so it's numbered */}
      <section id="how" className="border-t-2 border-ink scroll-mt-20">
        <div className="mx-auto max-w-[1320px] px-4 sm:px-8 py-16 sm:py-24 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4 lg:sticky lg:top-24 self-start">
            <p className="label text-ink-2">How a drop clears</p>
            <h2 className="display text-5xl sm:text-6xl mt-2">Four steps. One is waiting.</h2>
            <p className="mt-5 text-ink-2 max-w-[38ch]">Group buying isn&apos;t new. Doing it without punishing the first people in — and without hiding the margin — is.</p>
          </div>
          <ol className="lg:col-span-8 divide-y divide-line border-y border-line">
            {[
              [UsersThree, "Someone opens a drop", "A host — a Discord, a run club, a class chat — picks the item with the brand. The ladder is set so one group chat can open it."],
              [Lock, "You join with a hold, not a charge", "Your card is authorised at the current price. That's your ceiling. Nothing moves until the drop closes."],
              [TrendDown, "Every join pushes the price down for everyone", "Cross a tier and the new price applies to every member — first in included. Unlocked tiers never re-lock."],
              [Factory, "It closes, we charge the floor you reached, it gets made", "Capture at the final price, release the rest. The factory makes exactly the number ordered — no warehouse, no markdown bin."],
            ].map(([Icon, title, body], i) => {
              const I = Icon as typeof Lock;
              return (
                <li key={i} className="grid grid-cols-[auto_1fr] gap-x-6 sm:gap-x-10 py-7">
                  <span className="display text-stamp text-6xl num row-span-2 leading-[0.8]">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="display text-3xl flex items-center gap-3">
                    <I size={26} weight="duotone" className="text-ink-2 shrink-0" />
                    {title as string}
                  </h3>
                  <p className="text-ink-2 mt-2 max-w-[58ch]">{body as string}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* THE CHAT */}
      {chatDrop ? (
        <section className="bg-paper-2 border-y-2 border-ink">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-8 py-16 sm:py-24 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="order-2 lg:order-1 flex justify-center lg:justify-start">
              <ChatPreview
                slug={chatDrop.slug}
                item={chatDrop.item}
                priceCents={chatDrop.ladder.priceCents ?? chatDrop.tiers[0]!.priceCents}
                nextNeeded={chatDrop.ladder.next?.needed ?? null}
                nextPriceCents={chatDrop.ladder.next?.priceCents ?? null}
                siteHost={new URL(config.siteUrl).host}
              />
            </div>
            <div className="order-1 lg:order-2">
              <p className="label text-ink-2">Distribution</p>
              <h2 className="display text-5xl sm:text-6xl mt-2">The group chat was always the store.</h2>
              <p className="mt-5 text-lg text-ink-2 max-w-[48ch]">
                Screenshot, &ldquo;should I get this,&rdquo; verdict — that&apos;s how buying already works. So every member gets a link, and the link&apos;s preview shows the live price and how many more people it needs. Paste it once; it updates itself.
              </p>
              <p className="mt-4 text-ink-2 max-w-[48ch]">
                We don&apos;t buy ads. Hosts who bring a group get {rules.hostShareBps / 100}% of what it buys, out of our {rules.feeBps / 100}% — that&apos;s the whole marketing budget.
              </p>
              <Link href="/hosts" className="btn btn-sm btn-ghost mt-7">
                <HandCoins size={18} /> Host a drop
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* THE RECEIPT */}
      {receipt ? (
        <section className="mx-auto max-w-[1320px] px-4 sm:px-8 py-16 sm:py-24 grid gap-12 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5 lg:col-start-1">
            <Receipt
              title={`${receipt.brand} — ${receipt.item}`}
              lines={receipt.receipt}
              totalLabel={`You paid, at ${receipt.members}`}
              retailCents={receipt.retailCents}
              footer={`Cleared ${receipt.members} members · published unedited`}
            />
          </div>
          <div className="lg:col-span-6 lg:col-start-7 lg:pt-8">
            <p className="label text-ink-2 flex items-center gap-2">
              <ReceiptIcon size={14} /> Every cleared drop
            </p>
            <h2 className="display text-5xl sm:text-6xl mt-2">The {money(receipt.retailCents - (receipt.finalPriceCents ?? 0))} was never craftsmanship.</h2>
            <p className="mt-5 text-lg text-ink-2 max-w-[50ch]">
              A guaranteed, pre-paid order deletes the wholesale markup, the retail markup, the unsold-stock reserve and the ad budget. It doesn&apos;t remove a cent of material or labour — the mill and the sewing floor are paid the same either way. That&apos;s why we can print this.
            </p>
            <Link href="/receipts" className="btn btn-sm mt-7">
              All published receipts
            </Link>
          </div>
        </section>
      ) : null}

      {/* BYLAWS — they are numbered bylaws */}
      <section id="bylaws" className="border-t-2 border-ink scroll-mt-20">
        <div className="mx-auto max-w-[1320px] px-4 sm:px-8 py-16 sm:py-24">
          <div className="max-w-[46rem]">
            <p className="label text-ink-2">Bylaws</p>
            <h2 className="display text-5xl sm:text-6xl mt-2">Six promises we&apos;d have to break to make more money.</h2>
          </div>
          <ol className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 border-t border-line">
            {BYLAWS.map(([t, b], i) => (
              <li key={t} className="border-b border-line sm:odd:border-r lg:odd:border-r-0 lg:[&:not(:nth-child(3n))]:border-r py-7 sm:px-6 first:sm:pl-0 grid gap-2">
                <span className="label text-stamp">Bylaw {i + 1}</span>
                <h3 className="display text-3xl">{t}</h3>
                <p className="text-ink-2">{b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[1320px] px-4 sm:px-8 pb-8 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="label text-ink-2">Questions</p>
          <h2 className="display text-5xl mt-2">The ones that actually get asked</h2>
        </div>
        <div className="lg:col-span-8 border-t border-line">
          {FAQ.map(([q, a], i) => (
            <details key={q} className="border-b border-line group" open={i === 0}>
              <summary className="flex items-baseline justify-between gap-6 py-5">
                <span className="display text-2xl sm:text-3xl">{q}</span>
                <span className="faq-plus font-mono text-stamp text-2xl transition-transform" aria-hidden>
                  +
                </span>
              </summary>
              <p className="pb-6 text-ink-2 max-w-[62ch] -mt-1">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
