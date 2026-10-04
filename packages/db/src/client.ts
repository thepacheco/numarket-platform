import pg from "pg";

/* The only way the app touches the control database.

   withTenant(tenantId, fn) opens a transaction, drops to the restricted
   portal_app role, and sets app.tenant_id, so row-level security limits every
   tenant table to that one tenant. withPlatform(fn) does the same with no
   tenant set: tenant tables return zero rows there.

   withProvisioner(fn) runs as portal_provisioner for provisioning, seeding,
   and the demo reset. It can write every table, but row-level security still
   applies, so tenant tables need a tenant set. It must never be reached from
   a request that a tenant user controls. Migrations use the owner directly. */

export type Db = { query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values?: unknown[]): Promise<pg.QueryResult<T>> };

declare global {
  // eslint-disable-next-line no-var
  var __numarketPool: pg.Pool | undefined;
}

export function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

export function pool(): pg.Pool {
  if (!globalThis.__numarketPool) {
    globalThis.__numarketPool = new pg.Pool({
      connectionString: databaseUrl(),
      max: Number(process.env.DB_POOL_MAX ?? 5),
      idleTimeoutMillis: 10_000,
    });
  }
  return globalThis.__numarketPool;
}

export async function closePool() {
  await globalThis.__numarketPool?.end();
  globalThis.__numarketPool = undefined;
}

type Scope = { role: "app" | "provisioner"; tenantId: string | null; userId?: string | null };

async function inTransaction<T>(scope: Scope, fn: (db: Db) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    await client.query(scope.role === "app" ? "set local role portal_app" : "set local role portal_provisioner");
    await client.query("select set_config('app.tenant_id', $1, true), set_config('app.user_id', $2, true)", [scope.tenantId ?? "", scope.userId ?? ""]);
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Run fn as portal_app with row-level security pinned to one tenant. */
export function withTenant<T>(tenantId: string, fn: (db: Db) => Promise<T>, opts: { userId?: string | null } = {}) {
  if (!UUID.test(tenantId)) throw new Error("withTenant: invalid tenant id");
  return inTransaction({ role: "app", tenantId, userId: opts.userId }, fn);
}

/** Run fn as portal_app with no tenant set (platform tables only). */
export function withPlatform<T>(fn: (db: Db) => Promise<T>, opts: { userId?: string | null } = {}) {
  return inTransaction({ role: "app", tenantId: null, userId: opts.userId }, fn);
}

/** Provisioning, seeding, and the demo reset only. RLS still applies. */
export function withProvisioner<T>(fn: (db: Db) => Promise<T>, opts: { tenantId?: string | null } = {}) {
  if (opts.tenantId && !UUID.test(opts.tenantId)) throw new Error("withProvisioner: invalid tenant id");
  return inTransaction({ role: "provisioner", tenantId: opts.tenantId ?? null }, fn);
}
