import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { jsonError } from "@/lib/http";
import { refreshPracticeDrops } from "@/lib/seed";
import { getCtx } from "@/lib/server-ctx";
import { settleDue } from "@/lib/settle";

export const maxDuration = 300;

/**
 * Backstop sweep. Drops also settle lazily on the first page view after their
 * deadline, so this only has to catch drops nobody looked at. With practice
 * drops enabled (SEED_DEMO=true) it also keeps the practice board stocked.
 */
export async function GET(req: Request) {
  if (config.cronSecret && req.headers.get("authorization") !== `Bearer ${config.cronSecret}`) {
    return jsonError(401, "unauthorized", "Bad cron secret.");
  }
  if (!config.cronSecret && config.isProduction) {
    return jsonError(503, "not_configured", "Set CRON_SECRET to enable the settlement sweep.");
  }
  const ctx = await getCtx();
  const results = await settleDue(ctx);
  const practice = config.seedDemo ? await refreshPracticeDrops(ctx.db, ctx.now()) : null;
  return NextResponse.json({ settled: results, practice });
}
