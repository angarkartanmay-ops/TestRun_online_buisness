import "server-only";
import { config } from "./config";
import type { Ctx } from "./ctx";
import { listDrops, type DropWithLadder } from "./drops";
import { refreshPracticeDrops } from "./seed";

/**
 * The live board. With practice drops enabled (SEED_DEMO=true), an empty board
 * restocks itself on the spot instead of waiting for the daily sweep — so the
 * site never shows a dead homepage between real drops.
 */
export async function liveBoard(ctx: Ctx): Promise<DropWithLadder[]> {
  const live = await listDrops(ctx.db, ["live"]);
  if (live.length > 0 || !config.seedDemo) return live;
  await refreshPracticeDrops(ctx.db, ctx.now());
  return listDrops(ctx.db, ["live"]);
}
