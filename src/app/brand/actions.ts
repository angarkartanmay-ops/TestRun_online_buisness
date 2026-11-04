"use server";

import { revalidatePath } from "next/cache";
import { brandForUser, brandReply } from "@/lib/brands";
import { getCtx } from "@/lib/server-ctx";
import { getSessionUser } from "@/lib/session";

export async function brandReplyAction(form: FormData) {
  const user = await getSessionUser();
  if (!user) return;
  const ctx = await getCtx();
  const brand = await brandForUser(ctx, user.id);
  if (!brand || brand.status !== "approved") return;
  await brandReply(ctx, brand, String(form.get("wantId")), String(form.get("answer") ?? "").slice(0, 600));
  revalidatePath("/brand");
  revalidatePath("/wants");
}
