import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { modes } from "@/lib/config";
import { getDb } from "@/lib/db";

export async function GET() {
  let database = "ok";
  try {
    await (await getDb()).execute(sql`select 1`);
  } catch (err) {
    // Report the driver's own error, not the ORM wrapper's "Failed query: …": the root
    // cause (e.g. "Tenant or user not found") is what an operator needs to act on.
    const cause = err instanceof Error && err.cause instanceof Error ? err.cause : err;
    database = cause instanceof Error ? cause.message.slice(0, 200) : "error";
  }
  return NextResponse.json(
    { ok: database === "ok", database, modes },
    { status: database === "ok" ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
