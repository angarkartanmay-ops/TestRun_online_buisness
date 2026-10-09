import "server-only";
import { NextResponse } from "next/server";
import { after } from "next/server";
import { AuthError } from "./auth";
import { DropError } from "./drops";

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * Reject cross-site POSTs. Session cookies are SameSite=Lax already; this is the
 * second lock, and it also covers browsers with non-standard cookie handling.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches from older browsers, curl, server-to-server
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Map a thrown domain error to a response; anything unexpected becomes a 500. */
export function handleError(err: unknown) {
  if (err instanceof AuthError) {
    const status = err.code === "cooldown" || err.code === "rate_limited" ? 429 : err.code === "email_unavailable" ? 503 : 400;
    return jsonError(status, err.code, err.message);
  }
  if (err instanceof DropError) {
    const status = err.code === "not_found" ? 404 : err.code === "forbidden" ? 403 : err.code === "payment_failed" ? 402 : 409;
    return jsonError(status, err.code, err.message);
  }
  console.error(err);
  return jsonError(500, "server_error", "Something broke on our side. Nothing was charged — try again in a moment.");
}

/** Run follow-up work (emails, notifications) after the response is sent. */
export function runAfter(tasks: (() => Promise<void>)[]) {
  if (tasks.length === 0) return;
  after(async () => {
    for (const t of tasks) {
      try {
        await t();
      } catch (err) {
        console.error("[after]", err);
      }
    }
  });
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
