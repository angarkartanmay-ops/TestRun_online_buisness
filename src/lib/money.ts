/**
 * One currency per deployment, readable on the server and in the browser (Next
 * inlines NEXT_PUBLIC_* at build time), so a price can never render in one
 * currency on the page and another in an email. India first: INR by default.
 * Every amount in the app is an integer in minor units — paise for INR.
 */
export const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY || "inr").trim().toLowerCase();

const LOCALES: Record<string, string> = { inr: "en-IN", usd: "en-US", gbp: "en-GB", eur: "en-IE" };
export const LOCALE = LOCALES[CURRENCY] ?? "en-US";

/** Whole units when there are no paise ("₹1,049"), otherwise two places ("₹23.50"). */
export function money(minor: number, currency = CURRENCY): string {
  const whole = minor % 100 === 0;
  return new Intl.NumberFormat(LOCALES[currency.toLowerCase()] ?? "en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(minor / 100);
}

/** A count in the deployment's locale ("1,23,456" in India). */
export function count(n: number): string {
  return n.toLocaleString(LOCALE);
}

/** Basis points of an amount, rounded half-up to the minor unit. */
export function bps(minor: number, basisPoints: number): number {
  return Math.round((minor * basisPoints) / 10_000);
}

export function pct(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}
