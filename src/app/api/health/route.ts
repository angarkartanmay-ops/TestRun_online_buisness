import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { modes } from "@/lib/config";
import { getDb } from "@/lib/db";

export async function GET() {
  let database = "ok";
  try {
    await (await getDb()).execute(sql`select 1`);
  } catch (err) {
    database = err instanceof Error ? err.message.slice(0, 200) : "error";
  }
  return NextResponse.json(
    { ok: database === "ok", database, modes },
    { status: database === "ok" ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
