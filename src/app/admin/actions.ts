"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { approveBrandApplication } from "@/lib/brands";
import { brandApplications, drops, hostApplications, payouts, users } from "@/lib/db/schema";
import { parseDropForm } from "@/lib/drop-input";
import { getDrop } from "@/lib/drops";
import { getCtx } from "@/lib/server-ctx";
import { refreshPracticeDrops } from "@/lib/seed";
import { cancelDrop, closeCollection, markPaid, markShipped, refundDrop, settleDrop, settleDue } from "@/lib/settle";

export type DropFormState = { ok: boolean; message: string; errors?: Record<string, string> } | null;

export async function saveDrop(_prev: DropFormState, form: FormData): Promise<DropFormState> {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const parsed = parseDropForm(form);
  if (!parsed.ok) return { ok: false, message: "Fix the highlighted fields.", errors: parsed.errors };
  const ctx = await getCtx();
  const v = parsed.input.values;

  if (id) {
    const existing = await getDrop(ctx.db, id);
    if (!existing) return { ok: false, message: "That drop no longer exists." };
    if (existing.status !== "draft") {
      // Once members have joined, the terms they joined on are frozen.
      // The ship-by date is a promise to members too, so it is frozen with the price.
      // So are the sizes people picked from, the club fund's share, and whether it's practice.
      const { tiers: _t, retailCents: _r, opensAt: _o, closesAt: _c, shipBy: _b, status: _s, slug: _sl, kind: _k, hostShareBps: _h, feeBps: _f, sizes: _z, practice: _p, ...cosmetic } = v;
      await ctx.db.update(drops).set({ ...cosmetic, updatedAt: ctx.now() }).where(eq(drops.id, id));
      revalidatePath(`/admin/drops/${id}`);
      return { ok: true, message: "Saved. Price, ladder, sizes, club fund, dates and ship-by are locked once a drop is live." };
    }
    await ctx.db.update(drops).set({ ...v, updatedAt: ctx.now() }).where(eq(drops.id, id));
    revalidatePath(`/admin/drops/${id}`);
    return { ok: true, message: v.status === "live" ? "Published — the drop is live." : "Draft saved." };
  }

  const [taken] = await ctx.db.select({ id: drops.id }).from(drops).where(eq(drops.slug, v.slug)).limit(1);
  if (taken) return { ok: false, message: "Fix the highlighted fields.", errors: { slug: "Another drop already uses this address." } };
  const [created] = await ctx.db.insert(drops).values(v).returning({ id: drops.id });
  redirect(`/admin/drops/${created!.id}?saved=1`);
}

export async function dropAction(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const op = String(form.get("op"));
  const ctx = await getCtx();
  if (op === "settle") await settleDrop(ctx, id);
  else if (op === "cancel") await cancelDrop(ctx, id);
  else if (op === "shipped") await markShipped(ctx, id);
  else if (op === "refund") await refundDrop(ctx, id);
  else if (op === "close_collection") await closeCollection(ctx, id);
  revalidatePath(`/admin/drops/${id}`);
  revalidatePath("/admin");
}

/** Per-member actions on a drop: confirm a UPI payment. */
export async function pledgeAction(form: FormData) {
  await requireAdmin();
  const ctx = await getCtx();
  if (String(form.get("op")) === "paid") await markPaid(ctx, String(form.get("id")));
  revalidatePath(`/admin/drops/${String(form.get("dropId"))}`);
}

/** Open a fresh batch of practice drops now instead of waiting for the daily sweep. */
export async function refreshPractice() {
  await requireAdmin();
  const ctx = await getCtx();
  await refreshPracticeDrops(ctx.db, ctx.now());
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function settleAllDue() {
  await requireAdmin();
  await settleDue(await getCtx());
  revalidatePath("/admin");
}

export async function reviewHost(form: FormData) {
  await requireAdmin();
  const appId = String(form.get("id"));
  const decision = form.get("decision") === "approve" ? "approved" : "rejected";
  const ctx = await getCtx();
  const [app] = await ctx.db
    .update(hostApplications)
    .set({ status: decision, reviewedAt: ctx.now() })
    .where(eq(hostApplications.id, appId))
    .returning();
  if (app) await ctx.db.update(users).set({ hostStatus: decision }).where(eq(users.id, app.userId));
  revalidatePath("/admin/hosts");
}

export async function markBrand(form: FormData) {
  await requireAdmin();
  const status = String(form.get("status")) as "new" | "contacted" | "declined";
  if (!["new", "contacted", "declined"].includes(status)) return;
  await (await getCtx()).db.update(brandApplications).set({ status }).where(eq(brandApplications.id, String(form.get("id"))));
  revalidatePath("/admin/brands");
}

export async function markPayoutPaid(form: FormData) {
  await requireAdmin();
  const ctx = await getCtx();
  await ctx.db.update(payouts).set({ status: "paid", paidAt: ctx.now() }).where(eq(payouts.id, String(form.get("id"))));
  revalidatePath("/admin/payouts");
}

export async function approveBrand(form: FormData) {
  await requireAdmin();
  await approveBrandApplication(await getCtx(), String(form.get("id")));
  revalidatePath("/admin/brands");
}
