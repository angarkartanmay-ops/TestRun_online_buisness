"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/actions";
import { requireAdmin } from "@/lib/admin";
import { getCtx } from "@/lib/server-ctx";
import { getSessionUser } from "@/lib/session";
import { createWant, setWantStatus, toggleVote, wantSchema } from "@/lib/wants";
import { WANT_STATUSES } from "@/lib/db/schema";

export async function createWantAction(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/wants/new");
  const raw = Object.fromEntries(form);
  const parsed = wantSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0] ?? "form")] ??= i.message;
    return { ok: false, message: "Fix the highlighted fields.", errors };
  }
  const res = await createWant(await getCtx(), user, parsed.data);
  if (!res.ok) return { ok: false, message: res.error };
  revalidatePath("/wants");
  redirect(`/wants/${res.want.slug}`);
}

export async function voteAction(form: FormData) {
  const slug = String(form.get("slug") ?? "");
  const user = await getSessionUser();
  if (!user) redirect(`/sign-in?next=/wants/${encodeURIComponent(slug)}`);
  const price = String(form.get("maxPrice") ?? "").trim();
  await toggleVote(await getCtx(), user, String(form.get("wantId")), {
    city: String(form.get("city") ?? ""),
    maxPrice: price === "" || Number.isNaN(Number(price)) ? "" : Number(price),
  });
  revalidatePath(`/wants/${slug}`);
  revalidatePath("/wants");
}

export async function wantStatusAction(form: FormData) {
  await requireAdmin();
  const status = String(form.get("status"));
  if (!(WANT_STATUSES as readonly string[]).includes(status)) return;
  const answer = form.get("answer");
  await setWantStatus(await getCtx(), String(form.get("id")), status as (typeof WANT_STATUSES)[number], typeof answer === "string" ? answer : undefined);
  revalidatePath("/wants");
  revalidatePath("/admin/wants");
}
