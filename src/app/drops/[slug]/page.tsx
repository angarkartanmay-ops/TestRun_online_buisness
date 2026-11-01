import { CalendarCheck, Factory, Flag, Hourglass, Lock, Receipt as ReceiptIcon, Recycle, Ruler, TrendDown } from "@phosphor-icons/react/dist/ssr";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { plateStamp } from "@/components/drop-card";
import { LivePanel } from "@/components/live-panel";
import { PayBox } from "@/components/pay-box";
import { SpecimenPlate } from "@/components/plate";
import { Receipt } from "@/components/receipt";
import { config, payStyle } from "@/lib/config";
import { drops, pledges } from "@/lib/db/schema";
import { getDropBySlug, isDueForSettlement, liveState, withLadder } from "@/lib/drops";
import { fmtDate } from "@/lib/format";
import { CURRENCY, money } from "@/lib/money";
import { payCopy } from "@/lib/pay-copy";
import { canLeave } from "@/lib/pledges";
import { rules } from "@/lib/rules";
import { getCtx, pageCtx } from "@/lib/server-ctx";
import { getSessionUser } from "@/lib/session";
import { settleDrop } from "@/lib/settle";

type Params = { params: Promise<{ slug: string }> };

function Facts({ facts, className }: { facts: [typeof Factory, string, string][]; className: string }) {
  return (
    <dl className={`divide-y divide-line border-y border-line ${className}`}>
      {facts.map(([Icon, k, v]) => (
        <div key={k} className="flex gap-4 py-3 items-baseline">
          <dt className="label text-ink-3 w-28 shrink-0 flex items-center gap-2">
            <Icon size={14} className="translate-y-[1px]" /> {k}
          </dt>
          <dd className="text-ink-2">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const drop = await getDropBySlug((await getCtx()).db, slug);
  if (!drop || drop.status === "draft") return { title: "Drop not found" };
  const d = await withLadder((await getCtx()).db, drop);
  const price = money(d.ladder.priceCents ?? d.tiers[0]!.priceCents);
  const description = d.ladder.next
    ? `${d.members} in at ${price}. ${d.ladder.next.needed} more and it's ${money(d.ladder.next.priceCents)} for everyone. Retail ${money(d.retailCents)}.`
    : `${d.members} in — lowest price reached: ${price}. Retail ${money(d.retailCents)}.`;
  return { title: `${d.brand} ${d.item}`, description, openGraph: { title: `${d.item} — ${price} and falling`, description } };
}

export default async function DropPage({ params }: Params) {
  const ctx = await pageCtx();
  const { slug } = await params;
  const drop = await getDropBySlug(ctx.db, slug);
  if (!drop || drop.status === "draft") notFound();
  const now = ctx.now();
  if (isDueForSettlement(drop, now)) after(() => settleDrop(ctx, drop.id).then(() => undefined));
  // Pilot funnel: count the view after responding. Approximate by design (bots, refreshes).
  after(() => ctx.db.update(drops).set({ views: sql`${drops.views} + 1` }).where(eq(drops.id, drop.id)).then(() => undefined));

  const [user, state, d] = await Promise.all([getSessionUser(), liveState(ctx, drop), withLadder(ctx.db, drop)]);
  const [mine] = user
    ? await ctx.db
        .select()
        .from(pledges)
        .where(and(eq(pledges.dropId, drop.id), eq(pledges.userId, user.id), inArray(pledges.status, ["pending", "held", "capturing", "awaiting_payment", "charged"])))
        .limit(1)
    : [];
  const copy = payCopy(payStyle, drop.practice);
  const house = drop.kind === "house";

  const facts: [typeof Factory, string, string][] = [
    [Factory, "Made", drop.origin],
    [Flag, "Origin", `Made in ${drop.countryOfOrigin}`],
    [CalendarCheck, "Ships by", `${fmtDate(drop.shipBy)} — or a full refund`],
    [Hourglass, "Window", `${Math.round((drop.closesAt.getTime() - drop.opensAt.getTime()) / 3600_000)} hours, closes ${fmtDate(drop.closesAt)}`],
  ];
  if (drop.sizes.length) facts.push([Ruler, "Sizes", drop.sizes.join(" · ")]);
  if (drop.resaleIndex != null) {
    facts.push([Recycle, "Resale index", `${drop.resaleIndex.toFixed(2)} — secondhand price ÷ retail, last 90 days`]);
  }

  return (
    <div className="mx-auto max-w-[1320px] px-4 sm:px-8 pt-6 pb-10">
      <nav aria-label="Breadcrumb" className="label text-ink-3 flex gap-2 mb-6">
        <Link href="/drops" className="hover:text-ink">
          Drops
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/drops?c=${drop.category}`} className="hover:text-ink">
          {drop.category}
        </Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-6 lg:sticky lg:top-24 self-start grid gap-6">
          <SpecimenPlate drop={drop} priority stamp={plateStamp(d)} className="aspect-[4/3] lg:aspect-[4/5] border-2 border-ink" />
          <Facts facts={facts} className="hidden lg:block" />
        </div>

        <div className="lg:col-span-6 grid gap-8 content-start">
          {drop.practice ? (
            <p className="border-2 border-dashed border-ink px-4 py-3 text-sm">
              <b className="label text-stamp mr-2">Practice drop</b>
              The members on this drop are simulated and nobody pays — it&apos;s here so you can see how the price moves. Real drops don&apos;t carry this label.
            </p>
          ) : null}
          <header>
            <p className="label text-ink-2">{drop.brand}</p>
            <h1 className="display text-5xl sm:text-7xl mt-2">{drop.item}</h1>
            {drop.blurb ? <p className="mt-4 text-lg text-ink-2 max-w-[52ch]">{drop.blurb}</p> : null}
            {drop.spec ? <p className="mt-3 font-mono text-sm text-ink-3">{drop.spec}</p> : null}
          </header>

          <LivePanel
            slug={drop.slug}
            item={drop.item}
            brand={drop.brand}
            retailCents={drop.retailCents}
            tiers={drop.tiers}
            initial={state}
            viewer={{ signedIn: Boolean(user), crewCode: user?.crewCode ?? null }}
            pledge={
              mine
                ? { id: mine.id, status: mine.status, heldCents: mine.heldCents, chargedCents: mine.chargedCents, canLeave: canLeave(mine, drop, now) }
                : null
            }
            siteUrl={config.siteUrl}
            leaveGraceMinutes={rules.leaveGraceMinutes}
            payStyle={payStyle}
            practice={drop.practice}
            sizes={drop.sizes}
            payBox={mine?.status === "awaiting_payment" ? <PayBox ctx={ctx} pledge={mine} /> : undefined}
          />
          <p className="text-xs text-ink-3 -mt-4">
            {house
              ? "All-in prices: GST and delivery to your campus are included. No fees at checkout."
              : "Prices include taxes. Shipping, if any, is shown before you pay."}{" "}
            <Link href="/legal/shipping-returns" className="underline">
              Shipping, sizes &amp; returns
            </Link>
          </p>

          {/* On phones the facts follow the price and the join button, not precede them. */}
          <Facts facts={facts} className="lg:hidden" />

          <section aria-labelledby="hold-how" className="border-t-2 border-ink pt-6">
            <h2 id="hold-how" className="label text-ink-2 mb-4">
              {drop.practice ? "What would happen to your money" : copy.stepsTitle}
            </h2>
            <ol className="grid sm:grid-cols-3 gap-5">
              {copy.steps(money(state.ladder.holdCents), fmtDate(drop.closesAt), fmtDate(drop.shipBy)).map(([k, v], i) => [[Lock, TrendDown, CalendarCheck][i]!, k, v] as const).map(([Icon, k, v]) => {
                const I = Icon as typeof Lock;
                return (
                  <li key={k as string} className="grid gap-1.5">
                    <I size={22} weight="duotone" className="text-stamp" />
                    <p className="label">{k as string}</p>
                    <p className="text-sm text-ink-2">{v as string}</p>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </div>

      <section className="mt-20 grid gap-10 lg:grid-cols-12 lg:items-start" aria-labelledby="cost-sheet">
        <div className="lg:col-span-5">
          <p className="label text-ink-2 flex items-center gap-2">
            <ReceiptIcon size={14} /> {drop.status === "succeeded" ? "Published receipt" : "Cost sheet"}
          </p>
          <h2 id="cost-sheet" className="display text-5xl mt-2">
            {drop.receipt.length ? `Every ${CURRENCY === "inr" ? "rupee" : "cent"}, at the price it closed at` : "Published when it clears"}
          </h2>
          <p className="mt-4 text-ink-2 max-w-[44ch]">
            {house
              ? drop.receipt.length
                ? "Blank, print, courier, GST, the gateway, the club fund — and our margin, the red line. It's the only money QUORUM makes."
                : "The factory is named above. The full line-by-line cost sheet — blank, print, courier, GST, the club fund and our margin — is published the moment this drop clears."
              : drop.receipt.length
                ? `This is ${drop.brand}'s verified cost sheet at the lowest tier. Our ${drop.feeBps / 100}% is the red line — it's the only money QUORUM makes.`
                : `${drop.brand} has named the factory. The full line-by-line cost sheet — materials, labour, freight, duty, their margin and our ${drop.feeBps / 100}% — is published the moment this drop clears.`}
          </p>
        </div>
        {drop.receipt.length ? (
          <div className="lg:col-span-5 lg:col-start-8">
            <Receipt title={`${drop.brand} — ${drop.item}`} lines={drop.receipt} totalLabel="Floor price" retailCents={drop.retailCents} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
