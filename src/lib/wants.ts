import { randomBytes } from "node:crypto";
import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { z } from "zod";
import type { Ctx } from "./ctx";
import { wants, wantVotes, type User, type Want } from "./db/schema";

export const WANT_CITIES = ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi-Dharwad", "Elsewhere in India"] as const;
export const WANT_CATEGORIES = ["apparel", "footwear", "audio", "tech", "objects", "bags"] as const;
export const MAX_WANTS_PER_DAY = 3;

export const wantSchema = z.object({
  brand: z.string().trim().min(2, "Which brand?").max(80),
  item: z.string().trim().min(2, "Which item? Be specific: a model, not a category.").max(120),
  note: z.string().trim().max(400).default(""),
  city: z.enum(WANT_CITIES, "Pick your city.").default("Bengaluru"),
  category: z.enum(WANT_CATEGORIES, "Pick a category.").default("apparel"),
  maxPrice: z.union([z.literal(""), z.coerce.number().min(1, "Enter a price in rupees.").max(1_000_000)]).optional(),
});

export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);

const toCents = (rupees: number | "" | undefined) => (typeof rupees === "number" ? Math.round(rupees * 100) : null);

export type WantResult = { ok: true; want: Want } | { ok: false; error: string };

/** Post a new want. The poster's own vote is counted. */
export async function createWant(ctx: Ctx, user: User, input: z.input<typeof wantSchema>): Promise<WantResult> {
  const parsed = wantSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const v = parsed.data;

  const since = new Date(ctx.now().getTime() - 24 * 3600_000);
  const [{ n } = { n: 0 }] = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(wants)
    .where(and(eq(wants.createdBy, user.id), gte(wants.createdAt, since)));
  if (n >= MAX_WANTS_PER_DAY) return { ok: false, error: `You can post ${MAX_WANTS_PER_DAY} requests a day. Vote on an existing one instead.` };

  const base = slugify(`${v.brand} ${v.item}`) || "want";
  const [taken] = await ctx.db.select({ id: wants.id }).from(wants).where(eq(wants.slug, base)).limit(1);
  const slug = taken ? `${base}-${randomBytes(2).toString("hex")}` : base;

  const want = await ctx.db.transaction(async (tx) => {
    const [w] = await tx
      .insert(wants)
      .values({ slug, brand: v.brand, item: v.item, note: v.note, city: v.city, category: v.category, createdBy: user.id, createdAt: ctx.now() })
      .returning();
    await tx.insert(wantVotes).values({ wantId: w!.id, userId: user.id, city: v.city, maxPriceCents: toCents(v.maxPrice), createdAt: ctx.now() });
    return w!;
  });
  return { ok: true, want };
}

/** Add the user's vote, or remove it if they already voted. Returns whether they now count. */
export async function toggleVote(
  ctx: Ctx,
  user: User,
  wantId: string,
  opts: { city?: string; maxPrice?: number | "" } = {},
): Promise<{ ok: true; voted: boolean } | { ok: false; error: string }> {
  const [w] = await ctx.db.select().from(wants).where(eq(wants.id, wantId)).limit(1);
  if (!w || w.status === "hidden") return { ok: false, error: "That request isn't available." };

  const [mine] = await ctx.db
    .select({ id: wantVotes.id })
    .from(wantVotes)
    .where(and(eq(wantVotes.wantId, wantId), eq(wantVotes.userId, user.id)))
    .limit(1);
  if (mine) {
    await ctx.db.delete(wantVotes).where(eq(wantVotes.id, mine.id));
    return { ok: true, voted: false };
  }
  const city = (WANT_CITIES as readonly string[]).includes(opts.city ?? "") ? opts.city! : w.city;
  const price = typeof opts.maxPrice === "number" && opts.maxPrice > 0 && opts.maxPrice <= 1_000_000 ? opts.maxPrice : undefined;
  await ctx.db
    .insert(wantVotes)
    .values({ wantId, userId: user.id, city, maxPriceCents: toCents(price), createdAt: ctx.now() })
    .onConflictDoNothing();
  return { ok: true, voted: true };
}

export type WantRow = Want & { votes: number; medianPriceCents: number | null; priced: number };

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2);
}

async function withStats(ctx: Pick<Ctx, "db">, rows: Want[]): Promise<WantRow[]> {
  if (rows.length === 0) return [];
  const votes = await ctx.db
    .select({ wantId: wantVotes.wantId, price: wantVotes.maxPriceCents })
    .from(wantVotes);
  const byWant = new Map<string, { n: number; prices: number[] }>();
  for (const v of votes) {
    const e = byWant.get(v.wantId) ?? { n: 0, prices: [] };
    e.n++;
    if (v.price != null) e.prices.push(v.price);
    byWant.set(v.wantId, e);
  }
  return rows.map((w) => {
    const e = byWant.get(w.id);
    return { ...w, votes: e?.n ?? 0, medianPriceCents: median(e?.prices ?? []), priced: e?.prices.length ?? 0 };
  });
}

/** Public list, most-wanted first. Hidden requests are never returned. */
export async function listWants(ctx: Pick<Ctx, "db">, opts: { includeHidden?: boolean } = {}): Promise<WantRow[]> {
  const rows = await ctx.db
    .select()
    .from(wants)
    .where(opts.includeHidden ? undefined : ne(wants.status, "hidden"))
    .orderBy(desc(wants.createdAt));
  const stats = await withStats(ctx, rows);
  return stats.sort((a, b) => b.votes - a.votes || b.createdAt.getTime() - a.createdAt.getTime());
}

export type WantDetail = WantRow & { byCity: { city: string; n: number }[]; mine: boolean };

export async function getWant(ctx: Pick<Ctx, "db">, slug: string, viewerId?: string): Promise<WantDetail | null> {
  const [w] = await ctx.db.select().from(wants).where(eq(wants.slug, slug)).limit(1);
  if (!w) return null;
  const votes = await ctx.db.select().from(wantVotes).where(eq(wantVotes.wantId, w.id));
  const cities = new Map<string, number>();
  for (const v of votes) cities.set(v.city, (cities.get(v.city) ?? 0) + 1);
  const prices = votes.flatMap((v) => (v.maxPriceCents != null ? [v.maxPriceCents] : []));
  return {
    ...w,
    votes: votes.length,
    medianPriceCents: median(prices),
    priced: prices.length,
    byCity: [...cities].map(([city, n]) => ({ city, n })).sort((a, b) => b.n - a.n),
    mine: viewerId ? votes.some((v) => v.userId === viewerId) : false,
  };
}

export async function setWantStatus(ctx: Ctx, id: string, status: Want["status"], answer?: string) {
  await ctx.db
    .update(wants)
    .set(answer === undefined ? { status } : { status, answer: answer.trim().slice(0, 600) })
    .where(eq(wants.id, id));
}
