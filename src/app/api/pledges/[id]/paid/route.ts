import { NextResponse } from "next/server";
import { handleError, jsonError, sameOrigin } from "@/lib/http";
import { getCtx } from "@/lib/server-ctx";
import { getSessionUser } from "@/lib/session";
import { claimPaid } from "@/lib/settle";

/** The member says they've paid by UPI. Flags the pledge for the admin to check — never marks it paid. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden", "Cross-site request blocked.");
  const user = await getSessionUser();
  if (!user) return jsonError(401, "signed_out", "Your session ended. Sign in again.");
  try {
    await claimPaid(await getCtx(), user.id, (await params).id);
    return NextResponse.json({ claimed: true });
  } catch (err) {
    return handleError(err);
  }
}
