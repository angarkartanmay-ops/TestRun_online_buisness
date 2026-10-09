import "server-only";
import { config } from "./config";
import type { Ctx } from "./ctx";
import { getDb } from "./db";
import { defaultMailer } from "./mailer";
import { getPayments } from "./payments";

export async function getCtx(): Promise<Ctx> {
  return {
    db: await getDb(),
    payments: getPayments(),
    mailer: defaultMailer(),
    now: () => new Date(),
    siteUrl: config.siteUrl,
    currency: config.currency,
  };
}

/** For pages: opt out of build-time prerendering, then hand back the context. Live data only. */
export async function pageCtx(): Promise<Ctx> {
  const { connection } = await import("next/server");
  await connection();
  return getCtx();
}
