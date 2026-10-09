import type { MetadataRoute } from "next";
import { config } from "@/lib/config";
import { listDrops } from "@/lib/drops";
import { pageCtx } from "@/lib/server-ctx";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const ctx = await pageCtx();
  const drops = await listDrops(ctx.db, ["live", "succeeded"]);
  const base = ["", "/drops", "/receipts", "/hosts", "/brands", "/legal/preorders", "/legal/terms", "/legal/privacy"].map((p) => ({ url: `${config.siteUrl}${p}` }));
  return [...base, ...drops.map((d) => ({ url: `${config.siteUrl}/${d.status === "live" ? "drops" : "receipts"}/${d.slug}`, lastModified: d.updatedAt }))];
}
