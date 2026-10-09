import { NextResponse } from "next/server";
import { handleError, jsonError, runAfter, sameOrigin } from "@/lib/http";
import { leavePledge } from "@/lib/pledges";
import { getCtx } from "@/lib/server-ctx";
import { getSessionUser } from "@/lib/session";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden", "Cross-site request blocked.");
  const user = await getSessionUser();
  if (!user) return jsonError(401, "signed_out", "Your session ended. Sign in again.");
  try {
    const { after } = await leavePledge(await getCtx(), user, (await params).id);
    runAfter(after);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
