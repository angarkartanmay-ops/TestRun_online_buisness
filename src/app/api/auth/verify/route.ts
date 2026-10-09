import { NextResponse } from "next/server";
import { verifyCode } from "@/lib/auth";
import { config } from "@/lib/config";
import { handleError, jsonError, readJson, sameOrigin } from "@/lib/http";
import { getCtx } from "@/lib/server-ctx";
import { setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden", "Cross-site request blocked.");
  const { email, code } = await readJson(req);
  try {
    const { user, token, expiresAt } = await verifyCode(await getCtx(), String(email ?? ""), String(code ?? ""), {
      secret: config.authSecret,
    });
    await setSessionCookie(token, expiresAt);
    return NextResponse.json({ ok: true, user: { email: user.email, crewCode: user.crewCode } });
  } catch (err) {
    return handleError(err);
  }
}
