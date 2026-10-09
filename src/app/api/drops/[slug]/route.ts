import { after, NextResponse } from "next/server";
import { getDropBySlug, isDueForSettlement, liveState } from "@/lib/drops";
import { jsonError } from "@/lib/http";
import { getCtx } from "@/lib/server-ctx";
import { settleDrop } from "@/lib/settle";

/** Live state for the drop page, polled every few seconds. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getCtx();
  const drop = await getDropBySlug(ctx.db, slug);
  if (!drop || drop.status === "draft") return jsonError(404, "not_found", "That drop doesn't exist.");
  // Lazy settlement: the first request after the deadline closes the drop.
  if (isDueForSettlement(drop, ctx.now())) after(() => settleDrop(ctx, drop.id).then(() => undefined));
  return NextResponse.json(await liveState(ctx, drop), { headers: { "Cache-Control": "no-store" } });
}
