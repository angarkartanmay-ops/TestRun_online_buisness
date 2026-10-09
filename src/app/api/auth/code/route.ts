import { NextResponse } from "next/server";
import { emailSchema, requestCode } from "@/lib/auth";
import { config, modes, showLoginCodeOnScreen } from "@/lib/config";
import { handleError, jsonError, readJson, sameOrigin } from "@/lib/http";
import { getCtx } from "@/lib/server-ctx";
import { isAdmin } from "@/lib/session";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden", "Cross-site request blocked.");
  const { email } = await readJson(req);
  try {
    const parsed = emailSchema.safeParse(email);
    const admin = parsed.success && isAdmin(parsed.data);
    const result = await requestCode(await getCtx(), String(email ?? ""), {
      secret: config.authSecret,
      // Never show an admin's code on screen — it goes to the inbox (or the server log).
      revealCode: showLoginCodeOnScreen && !admin,
      deliverable: modes.email === "resend" || admin,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return handleError(err);
  }
}
