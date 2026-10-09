import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { handleError, jsonError, readJson, runAfter, sameOrigin } from "@/lib/http";
import { joinDrop } from "@/lib/pledges";
import { getCtx } from "@/lib/server-ctx";
import { CREW_COOKIE, getSessionUser } from "@/lib/session";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden", "Cross-site request blocked.");
  const user = await getSessionUser();
  if (!user) return jsonError(401, "signed_out", "Sign in to join — it takes one code.");
  const { slug } = await params;
  const { size } = await readJson(req);
  try {
    const crew = (await cookies()).get(CREW_COOKIE)?.value ?? null;
    const { after, ...result } = await joinDrop(await getCtx(), user, slug, {
      referrerCode: crew,
      size: typeof size === "string" ? size : null,
    });
    runAfter(after);
    return NextResponse.json({ ...result, publishableKey: config.stripePublishableKey ?? null });
  } catch (err) {
    return handleError(err);
  }
}
