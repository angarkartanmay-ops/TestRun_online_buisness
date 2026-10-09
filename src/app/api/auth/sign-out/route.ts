import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { revokeToken } from "@/lib/auth";
import { jsonError, sameOrigin } from "@/lib/http";
import { getCtx } from "@/lib/server-ctx";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError(403, "forbidden", "Cross-site request blocked.");
  const jar = await cookies();
  await revokeToken(await getCtx(), jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
