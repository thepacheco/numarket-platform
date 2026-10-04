/* Applies packages/db/migrations/*.sql in order, once each.
   Usage: DATABASE_URL=... npm run db:migrate */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { closePool, pool } from "../src/client";

/* Neon gives a pooled URL for the app and a direct one for schema work. */
if (process.env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

export async function migrate(log = console.log) {
  const client = await pool().connect();
  try {
    await client.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
    const done = new Set((await client.query<{ name: string }>("select name from schema_migrations")).rows.map((r) => r.name));
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      if (done.has(file)) continue;
      await client.query("begin");
      try {
        await client.query(readFileSync(join(dir, file), "utf8"));
        await client.query("insert into schema_migrations (name) values ($1)", [file]);
        await client.query("commit");
        log(`applied ${file}`);
      } catch (e) {
        await client.query("rollback");
        throw new Error(`migration ${file} failed: ${(e as Error).message}`);
      }
    }
  } finally {
    client.release();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  migrate()
    .then(() => closePool())
    .catch(async (e) => {
      console.error(e.message);
      await closePool();
      process.exit(1);
    });
}
