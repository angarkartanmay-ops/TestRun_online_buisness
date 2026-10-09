/** Load the sample drops. Usage: npm run db:seed (uses DATABASE_URL, else the local .pglite db). */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { seedDemo } from "../src/lib/seed";
import type { DB } from "../src/lib/db";

const url = process.env.DATABASE_URL;
if (url) {
  const client = postgres(url, { max: 1, prepare: false });
  await seedDemo(drizzle(client, { schema }) as unknown as DB);
  await client.end();
} else {
  const { createPglite } = await import("../src/lib/db/pglite");
  await seedDemo(await createPglite({ dataDir: ".pglite" }));
}
console.log("Sample drops loaded.");
