import { eq, sql } from "drizzle-orm";
import { findOrCreateUser } from "./auth";
import type { Ctx } from "./ctx";
import { brandApplications, brands, drops, wants, wantVotes, type Brand, type Drop } from "./db/schema";
import { listWants, setWantStatus, slugify, type WantRow } from "./wants";

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export async function brandForUser(ctx: Pick<Ctx, "db">, userId: string): Promise<Brand | null> {
  const [b] = await ctx.db.select().from(brands).where(eq(brands.ownerUserId, userId)).limit(1);
  return b ?? null;
}

/** Turn a proposal into a brand account owned by the applicant's login. */
export async function approveBrandApplication(ctx: Ctx, applicationId: string): Promise<{ ok: true; brand: Brand } | { ok: false; error: string }> {
  const [app] = await ctx.db.select().from(brandApplications).where(eq(brandApplications.id, applicationId)).limit(1);
  if (!app) return { ok: false, error: "Application not found." };

  let ownerId = app.userId;
  if (!ownerId) ownerId = (await findOrCreateUser(ctx, app.email.trim().toLowerCase())).id;
  if (await brandForUser(ctx, ownerId)) return { ok: false, error: "That account already owns a brand." };

  const base = slugify(app.brand) || "brand";
  const [taken] = await ctx.db.select({ id: brands.id }).from(brands).where(eq(brands.slug, base)).limit(1);
  const slug = taken ? `${base}-${Math.random().toString(36).slice(2, 6)}` : base;

  const brand = await ctx.db.transaction(async (tx) => {
    const [b] = await tx.insert(brands).values({ slug, name: app.brand, ownerUserId: ownerId!, factory: app.factory, createdAt: ctx.now() }).returning();
    await tx.update(brandApplications).set({ status: "approved", userId: ownerId }).where(eq(brandApplications.id, app.id));
    return b!;
  });
  return { ok: true, brand };
}

/** Requests that name this brand. Hidden requests are never included. */
export async function brandDemand(ctx: Pick<Ctx, "db">, name: string): Promise<WantRow[]> {
  return (await listWants(ctx)).filter((w) => same(w.brand, name));
}

export async function brandDrops(ctx: Pick<Ctx, "db">, name: string): Promise<Drop[]> {
  return ctx.db.select().from(drops).where(sql`lower(${drops.brand}) = lower(${name.trim()})`);
}

/** A brand may reply only to requests that name it. */
export async function brandReply(ctx: Ctx, brand: Brand, wantId: string, answer: string): Promise<boolean> {
  const [w] = await ctx.db.select().from(wants).where(eq(wants.id, wantId)).limit(1);
  if (!w || w.status === "hidden" || !same(w.brand, brand.name)) return false;
  await setWantStatus(ctx, wantId, answer.trim() ? "answered" : "open", answer);
  return true;
}

export type DemandReport = { brand: string; requests: WantRow[]; totalVotes: number; byCity: { city: string; n: number }[]; generatedAt: Date };

/** The numbers to put in front of a brand: every public request naming it, and where the voters are. */
export async function demandReport(ctx: Pick<Ctx, "db" | "now">, name: string): Promise<DemandReport> {
  const requests = (await brandDemand(ctx, name)).sort((a, b) => b.votes - a.votes);
  const ids = new Set(requests.map((r) => r.id));
  const votes = ids.size
    ? await ctx.db.select({ wantId: wantVotes.wantId, city: wantVotes.city }).from(wantVotes)
    : [];
  const cities = new Map<string, number>();
  for (const v of votes) if (ids.has(v.wantId)) cities.set(v.city, (cities.get(v.city) ?? 0) + 1);
  return {
    brand: name,
    requests,
    totalVotes: requests.reduce((n, r) => n + r.votes, 0),
    byCity: [...cities].map(([city, n]) => ({ city, n })).sort((a, b) => b.n - a.n),
    generatedAt: ctx.now(),
  };
}
