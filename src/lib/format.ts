import { CURRENCY, LOCALE } from "./money";

/**
 * Dates render in the market's time zone on the server and in the browser alike,
 * so "closes 4 Nov, 7:30 pm" means the same moment to everyone in the drop.
 */
export const TIME_ZONE = process.env.NEXT_PUBLIC_TIME_ZONE || (CURRENCY === "inr" ? "Asia/Kolkata" : "UTC");
const ZONE_LABEL: Record<string, string> = { "Asia/Kolkata": "IST", UTC: "UTC" };

const dateFmt = new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric", timeZone: TIME_ZONE });
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: TIME_ZONE });

export const fmtDate = (d: Date | string) => dateFmt.format(new Date(d));
export const fmtDateTime = (d: Date | string) => dateTimeFmt.format(new Date(d));
/** With the zone spelled out, for emails: "4 Nov, 7:30 pm IST". */
export const fmtDateTimeZone = (d: Date | string) => `${fmtDateTime(d)} ${ZONE_LABEL[TIME_ZONE] ?? TIME_ZONE}`;

/** "2d 13h", "13h 04m", "4m 09s" — coarse enough to read at a glance. */
export function fmtRemaining(ms: number): string {
  if (ms <= 0) return "Closed";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${p(h)}h`;
  if (h > 0) return `${h}h ${p(m)}m`;
  return `${m}m ${p(sec)}s`;
}

/**
 * The short origin for a specimen plate. Country codes when the line has them
 * ("Okayama, JP · sewn in Tijuana, MX" → "JP · MX"), otherwise the cities
 * ("Knit + printed in Tiruppur, Tamil Nadu" → "Tiruppur").
 */
export function originCodes(origin: string): string {
  const codes = [...new Set(origin.match(/\b[A-Z]{2}\b/g) ?? [])];
  if (codes.length) return codes.join(" · ");
  return [...new Set([...origin.matchAll(/\bin ([A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+)?),/g)].map((m) => m[1]!))].join(" · ");
}

export function relTime(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
