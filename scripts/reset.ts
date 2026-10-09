/** Remove sample data before launch. Real members and drops are kept. */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { clearDemo } from "../src/lib/seed";
import type { DB } from "../src/lib/db";

const url = process.env.DATABASE_URL;
if (url) {
  const client = postgres(url, { max: 1, prepare: false });
  await clearDemo(drizzle(client, { schema }) as unknown as DB);
  await client.end();
} else {
  const { createPglite } = await import("../src/lib/db/pglite");
  await clearDemo(await createPglite({ dataDir: ".pglite" }));
}
console.log("Sample data removed.");
