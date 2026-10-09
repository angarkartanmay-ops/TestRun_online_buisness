/** Whole dollars when the cents are zero ("$41"), otherwise two places ("$23.50"). */
export function money(cents: number, currency = "usd"): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100);
}

/** Basis points of an amount, rounded half-up to the cent. */
export function bps(cents: number, basisPoints: number): number {
  return Math.round((cents * basisPoints) / 10_000);
}

export function pct(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}
