"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { emailSchema } from "@/lib/auth";
import { brandApplications, hostApplications, users } from "@/lib/db/schema";
import { getCtx } from "@/lib/server-ctx";
import { getSessionUser } from "@/lib/session";

export type FormState = { ok: boolean; message: string; errors?: Record<string, string> } | null;

const hostSchema = z.object({
  groupName: z.string().trim().min(2, "Name the group.").max(120),
  groupSize: z.coerce.number().int().min(2, "A group is at least two people.").max(10_000_000),
  brief: z.string().trim().min(10, "Say what the group would actually buy — an item, not a category.").max(1000),
});

export async function applyToHost(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=/hosts%23apply");
  const parsed = hostSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Fix the highlighted fields.", errors: fieldErrors(parsed.error) };
  const ctx = await getCtx();
  const [open] = await ctx.db
    .select({ id: hostApplications.id })
    .from(hostApplications)
    .where(and(eq(hostApplications.userId, user.id), eq(hostApplications.status, "pending")))
    .limit(1);
  if (open) return { ok: true, message: "You already have an application in. We reply within three working days." };
  await ctx.db.insert(hostApplications).values({ userId: user.id, ...parsed.data });
  if (user.hostStatus === "none") await ctx.db.update(users).set({ hostStatus: "pending" }).where(eq(users.id, user.id));
  return { ok: true, message: "Application in. We'll email you within three working days — usually with a mill that can make your brief." };
}

const brandSchema = z.object({
  email: emailSchema,
  brand: z.string().trim().min(2, "Brand name, please.").max(120),
  item: z.string().trim().min(2, "Which item?").max(160),
  factory: z.string().trim().min(3, "Name the factory and city. It's Bylaw 3 — we can't run a drop without it.").max(200),
  unitCost: z.union([z.literal(""), z.coerce.number().min(0).max(100_000)]).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export async function applyAsBrand(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = brandSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Fix the highlighted fields.", errors: fieldErrors(parsed.error) };
  const { unitCost, notes, ...rest } = parsed.data;
  await (await getCtx()).db.insert(brandApplications).values({
    ...rest,
    unitCostCents: typeof unitCost === "number" ? Math.round(unitCost * 100) : null,
    notes: notes ?? "",
  });
  return { ok: true, message: "Got it. We reply within three working days with a proposed ladder — or a straight no and the reason." };
}

function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? "form");
    out[k] ??= k === "email" ? "That doesn't look like an email address." : issue.message;
  }
  return out;
}
