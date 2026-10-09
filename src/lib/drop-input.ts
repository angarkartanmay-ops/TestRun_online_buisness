import { z } from "zod";
import type { ReceiptLine, Tier } from "./db/schema";
import { rules } from "./rules";
import { validateTiers } from "./tiers";

export const CATEGORIES = ["apparel", "audio", "tech", "objects", "bags"] as const;

const dollars = (v: unknown) => Math.round(Number(v) * 100);

/** Receipt lines from a textarea: "Label | 9.10 | optional note". A label starting "QUORUM" is our fee line. */
export function parseReceipt(text: string): { lines: ReceiptLine[]; errors: string[] } {
  const lines: ReceiptLine[] = [];
  const errors: string[] = [];
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((raw, i) => {
      const [label, amount, note] = raw.split("|").map((s) => s.trim());
      const cents = dollars(amount);
      if (!label || !Number.isFinite(cents) || cents < 0) errors.push(`Receipt line ${i + 1}: use "Label | 9.10 | optional note".`);
      else lines.push({ label, cents, ...(note ? { note } : {}), ...(/^quorum/i.test(label) ? { ours: true } : {}) });
    });
  return { lines, errors };
}

export const receiptToText = (lines: ReceiptLine[]) =>
  lines.map((l) => [l.label, (l.cents / 100).toFixed(2), l.note].filter(Boolean).join(" | ")).join("\n");

const schema = z.object({
  brand: z.string().trim().min(1, "Required.").max(80),
  item: z.string().trim().min(1, "Required.").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only.")
    .max(80),
  blurb: z.string().trim().max(400).default(""),
  spec: z.string().trim().max(160).default(""),
  category: z.enum(CATEGORIES),
  glyph: z.string().trim().min(1),
  plate: z.string().trim().min(1),
  imageUrl: z.union([z.literal(""), z.url({ protocol: /^https$/, message: "Must be an https:// image URL." })]).default(""),
  retail: z.coerce.number().positive("Retail price must be above zero."),
  origin: z.string().trim().min(3, "Name the factory city and country — Bylaw 3.").max(200),
  opensAt: z.string().min(1, "Required."),
  windowHours: z.coerce.number().int().min(12, "At least 12 hours.").max(rules.maxWindowHours, `At most ${rules.maxWindowHours} hours — card holds expire after 7 days.`),
  shipDays: z.coerce.number().int().min(7, "At least a week after close.").max(180),
  resaleIndex: z.union([z.literal(""), z.coerce.number().min(0).max(2)]).default(""),
  tiers: z.string(),
  receipt: z.string().default(""),
  status: z.enum(["draft", "live"]),
});

export type DropInput = {
  values: {
    brand: string; item: string; slug: string; blurb: string; spec: string; category: string; glyph: string; plate: string;
    imageUrl: string | null; retailCents: number; origin: string; opensAt: Date; closesAt: Date; shipBy: Date;
    resaleIndex: number | null; tiers: Tier[]; receipt: ReceiptLine[]; status: "draft" | "live";
  };
};

export function parseDropForm(form: FormData): { ok: true; input: DropInput } | { ok: false; errors: Record<string, string> } {
  const raw = Object.fromEntries(form) as Record<string, string>;
  const parsed = schema.safeParse(raw);
  const errors: Record<string, string> = {};
  if (!parsed.success) for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;

  // Check the ladder and cost sheet even when other fields failed, so every
  // problem is reported in one pass instead of one round-trip at a time.
  let tiers: Tier[] = [];
  try {
    tiers = (JSON.parse(raw.tiers ?? "[]") as { min: number; price: number }[]).map((t) => ({ min: Math.round(Number(t.min)), priceCents: dollars(t.price) }));
  } catch {
    errors.tiers = "Couldn't read the ladder.";
  }
  const retailCents = dollars(raw.retail);
  const tierErrors = validateTiers(tiers, Number.isFinite(retailCents) ? retailCents : 0, rules.maxFirstTierMembers);
  if (tierErrors.length) errors.tiers ??= tierErrors.join(" ");
  const receipt = parseReceipt(raw.receipt ?? "");
  if (receipt.errors.length) errors.receipt ??= receipt.errors.join(" ");
  const opensAt = new Date(raw.opensAt ?? "");
  if (Number.isNaN(opensAt.getTime())) errors.opensAt ??= "Pick a date and time.";
  if (!parsed.success || Object.keys(errors).length) return { ok: false, errors };
  const v = parsed.data;

  const closesAt = new Date(opensAt.getTime() + v.windowHours * 3600_000);
  return {
    ok: true,
    input: {
      values: {
        brand: v.brand, item: v.item, slug: v.slug, blurb: v.blurb, spec: v.spec, category: v.category, glyph: v.glyph, plate: v.plate,
        imageUrl: v.imageUrl || null, retailCents, origin: v.origin, opensAt, closesAt,
        shipBy: new Date(closesAt.getTime() + v.shipDays * 86400_000),
        resaleIndex: v.resaleIndex === "" ? null : Number(v.resaleIndex),
        tiers, receipt: receipt.lines, status: v.status,
      },
    },
  };
}
