import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { count } from "drizzle-orm";
import path from "node:path";
import * as schema from "./schema";
import type { DB } from "./index";

/**
 * Embedded Postgres for local development and tests. `dataDir` persists to disk;
 * omit it for a throwaway in-memory database.
 */
export async function createPglite(opts: { dataDir?: string; seed?: boolean } = {}): Promise<DB> {
  // Local-only path: keep it out of the bundler's file tracing, or it ships the whole repo.
  const client = opts.dataDir ? new PGlite(path.resolve(/*turbopackIgnore: true*/ opts.dataDir)) : new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  if (opts.seed) {
    const [row] = await db.select({ n: count() }).from(schema.drops);
    if (!row || row.n === 0) {
      const { seedDemo } = await import("../seed");
      await seedDemo(db as unknown as DB);
    }
  }
  return db as unknown as DB;
}
