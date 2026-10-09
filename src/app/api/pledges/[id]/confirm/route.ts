import { NextResponse } from "next/server";
import { handleError, jsonError, runAfter, sameOrigin } from "@/lib/http";
import { confirmPledge } from "@/lib/pledges";
import { getCtx } from "@/lib/server-ctx";
import { getSessionUser } from "@/lib/session";

/** After Stripe confirms the card in the browser — re-checked with Stripe, never trusted. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden", "Cross-site request blocked.");
  const user = await getSessionUser();
  if (!user) return jsonError(401, "signed_out", "Your session ended. Sign in again.");
  try {
    const { after, status } = await confirmPledge(await getCtx(), user, (await params).id);
    runAfter(after);
    return NextResponse.json({ status });
  } catch (err) {
    return handleError(err);
  }
}
