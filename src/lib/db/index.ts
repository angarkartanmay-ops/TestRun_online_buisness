import "server-only";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";
import { config } from "../config";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

type Holder = { db?: Promise<DB> };
const holder = globalThis as unknown as { __quorumDb?: Holder };
holder.__quorumDb ??= {};

/**
 * One connection per server instance, kept on globalThis so dev hot-reloads
 * don't leak pools. Postgres when DATABASE_URL is set; otherwise an embedded
 * PGlite database that migrates and seeds itself on first boot.
 */
export function getDb(): Promise<DB> {
  const h = holder.__quorumDb!;
  h.db ??= connect().catch((err) => {
    h.db = undefined; // let the next request retry instead of caching the failure
    throw err;
  });
  return h.db;
}

/** Idempotent: drops are keyed on a unique slug, so racing cold starts can't double-seed. */
async function seedIfEmpty(db: DB) {
  const { count } = await import("drizzle-orm");
  const [row] = await db.select({ n: count() }).from(schema.drops);
  if (!row || row.n === 0) {
    const { seedDemo } = await import("../seed");
    await seedDemo(db);
  }
}

async function connect(): Promise<DB> {
  if (config.databaseUrl) {
    const client = postgres(config.databaseUrl, {
      max: config.isVercel ? 1 : 10,
      prepare: false, // required behind transaction poolers (Supabase :6543, pgbouncer)
      idle_timeout: 20,
      connect_timeout: 10,
    });
    const db = drizzlePostgres(client, { schema }) as unknown as DB;
    if (config.seedDemo) await seedIfEmpty(db);
    return db;
  }
  if (config.isVercel) {
    throw new Error(
      "DATABASE_URL is not set. The embedded database is for local development only — " +
        "add a Postgres connection string in Vercel → Project → Settings → Environment Variables.",
    );
  }
  const { createPglite } = await import("./pglite");
  return createPglite({ dataDir: ".pglite", seed: true });
}
