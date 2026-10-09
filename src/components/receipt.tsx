import type { ReceiptLine } from "@/lib/db/schema";
import { money } from "@/lib/money";

export function Receipt({
  title,
  lines,
  totalLabel = "Member price",
  retailCents,
  footer,
}: {
  title: string;
  lines: ReceiptLine[];
  totalLabel?: string;
  retailCents?: number;
  footer?: string;
}) {
  const total = lines.reduce((s, l) => s + l.cents, 0);
  return (
    <div className="receipt px-5 sm:px-7 pt-6 text-ink">
      <p className="text-center label text-ink-2">QUORUM · Local 001</p>
      <p className="text-center font-bold mt-1">{title}</p>
      <p className="text-center text-ink-3 text-xs mt-1">{"=".repeat(32)}</p>
      <div className="mt-3 space-y-1">
        {lines.map((l) => (
          <div key={l.label}>
            <div className={`receipt-row ${l.ours ? "text-stamp" : ""}`}>
              <span>{l.label}</span>
              <span className="lead" aria-hidden />
              <span className="amt">{money(l.cents)}</span>
            </div>
            {l.note ? <p className="text-ink-3 pl-4 text-xs">{l.note}</p> : null}
          </div>
        ))}
      </div>
      <div className="receipt-row border-t-2 border-ink mt-3 pt-2 font-bold">
        <span>{totalLabel}</span>
        <span className="lead" aria-hidden />
        <span className="amt">{money(total)}</span>
      </div>
      {retailCents ? (
        <>
          <div className="receipt-row mt-3 text-ink-2">
            <span>Brand&apos;s own site</span>
            <span className="lead" aria-hidden />
            <span className="amt line-through">{money(retailCents)}</span>
          </div>
          <div className="receipt-row font-bold text-go">
            <span>You kept</span>
            <span className="lead" aria-hidden />
            <span className="amt">{money(retailCents - total)}</span>
          </div>
        </>
      ) : null}
      {footer ? <p className="text-center text-ink-3 text-xs mt-5">{footer}</p> : null}
      <p className="text-center text-ink-3 text-xs mt-2 tracking-[0.3em]">|||| ||| || |||| | ||</p>
    </div>
  );
}
