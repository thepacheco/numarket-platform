/* Builds a fresh test database once per run: drop everything, migrate, seed. */
import pg from "pg";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://localhost:5432/numarket_platform_test";
  process.env.DATABASE_URL = url;
  process.env.ALLOW_DEV_SIGNIN = "1";
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  await c.query("drop schema if exists public cascade; create schema public;");
  await c.end();
  const { migrate } = await import("../packages/db/scripts/migrate");
  const { seed } = await import("../packages/db/scripts/seed");
  const { closePool } = await import("../packages/db/src/client");
  await migrate(() => {});
  await seed(() => {});
  await closePool();
}
