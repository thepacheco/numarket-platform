/* Tenant isolation (Platform Build Spec §5). These must always pass. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closePool, withProvisioner, withPlatform, withTenant } from "../packages/db/src/client";
import { latestSnapshot } from "../packages/db/src/repo/snapshots";
import { authenticateTenant, tenantBySlug, tenantForHost, type Tenant } from "../packages/auth/src/context";
import { hostConfigFromEnv } from "../packages/auth/src/hosts";
import { startDemoSession, startDevTenantSession } from "../packages/auth/src/providers";

const PLATFORM_TABLES = new Set(["tenant_hosts", "sessions"]);
let demo: Tenant;
let acme: Tenant;
const cfg = () => hostConfigFromEnv();
const req = { ip: "203.0.113.10", userAgent: "vitest" };

async function tenantTables() {
  return withProvisioner(async (db) => {
    const r = await db.query<{ relname: string; rls: boolean; forced: boolean; policies: number }>(
      `select c.relname, c.relrowsecurity as rls, c.relforcerowsecurity as forced,
              (select count(*)::int from pg_policies p where p.tablename = c.relname and p.schemaname = 'public') as policies
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
       join pg_attribute a on a.attrelid = c.oid and a.attname = 'tenant_id' and not a.attisdropped
       where n.nspname = 'public' and c.relkind = 'r' order by c.relname`,
    );
    return r.rows.filter((t) => !PLATFORM_TABLES.has(t.relname));
  });
}

beforeAll(async () => {
  demo = (await tenantBySlug("demo"))!;
  acme = (await tenantBySlug("acme"))!;
});
afterAll(() => closePool());

describe("row-level security coverage", () => {
  it("every tenant table has RLS enabled, forced, and a policy", async () => {
    const tables = await tenantTables();
    expect(tables.length).toBeGreaterThan(10);
    for (const t of tables) {
      expect({ table: t.relname, rls: t.rls, forced: t.forced, hasPolicy: t.policies > 0 }).toEqual({ table: t.relname, rls: true, forced: true, hasPolicy: true });
    }
  });

  it("with no tenant set, every tenant table returns zero rows", async () => {
    for (const t of await tenantTables()) {
      const n = await withPlatform(async (db) => (await db.query<{ n: number }>(`select count(*)::int as n from ${t.relname}`)).rows[0].n);
      expect({ table: t.relname, rows: n }).toEqual({ table: t.relname, rows: 0 });
    }
  });

  it("a tenant sees only its own rows", async () => {
    for (const t of await tenantTables()) {
      const ids = await withTenant(acme.id, async (db) => (await db.query<{ tenant_id: string }>(`select distinct tenant_id from ${t.relname}`)).rows.map((r) => r.tenant_id));
      expect(ids.every((id) => id === acme.id)).toBe(true);
    }
  });

  it("provisioning with no tenant set sees zero tenant rows too", async () => {
    for (const t of await tenantTables()) {
      const n = await withProvisioner(async (db) => (await db.query<{ n: number }>(`select count(*)::int as n from ${t.relname}`)).rows[0].n);
      expect({ table: t.relname, rows: n }).toEqual({ table: t.relname, rows: 0 });
    }
  });

  it("the restricted role cannot turn row security off", async () => {
    await expect(
      withTenant(acme.id, async (db) => {
        await db.query("set local row_security = off");
        await db.query("select * from flags");
      }),
    ).rejects.toThrow();
  });
});

describe("cross-tenant reads and writes", () => {
  it("cannot read another tenant's snapshot by id", async () => {
    const demoSnapshotId = await withTenant(demo.id, async (db) => (await db.query<{ id: string }>("select id from snapshots order by version desc limit 1")).rows[0].id);
    const seen = await withTenant(acme.id, async (db) => (await db.query("select * from snapshots where id = $1", [demoSnapshotId])).rowCount);
    expect(seen).toBe(0);
    const own = await withTenant(acme.id, latestSnapshot);
    expect(JSON.stringify(own?.datasets)).not.toContain("Route 9 Bridge");
  });

  it("cannot insert rows into another tenant", async () => {
    await expect(
      withTenant(acme.id, (db) => db.query("insert into flags (tenant_id, title, detail, source) values ($1, 'x', 'x', 'x')", [demo.id])),
    ).rejects.toThrow(/row-level security/);
  });

  it("cannot update or delete another tenant's rows", async () => {
    const updated = await withTenant(acme.id, async (db) => (await db.query("update flags set title = 'hijacked' where tenant_id = $1", [demo.id])).rowCount);
    const deleted = await withTenant(acme.id, async (db) => (await db.query("delete from input_screens where tenant_id = $1", [demo.id])).rowCount);
    expect(updated).toBe(0);
    expect(deleted).toBe(0);
  });

  it("users are visible only within the current tenant", async () => {
    const emails = await withTenant(acme.id, async (db) => (await db.query<{ email: string }>("select email from users")).rows.map((r) => r.email));
    expect(emails.length).toBeGreaterThan(0);
    expect(emails.some((e) => e.includes("summitbuilders"))).toBe(false);
  });

  it("the audit log is append-only for the app", async () => {
    await expect(withTenant(acme.id, (db) => db.query("delete from audit_log"))).rejects.toThrow(/permission denied/);
    await expect(withTenant(acme.id, (db) => db.query("update audit_log set action = 'x'"))).rejects.toThrow(/permission denied/);
  });
});

describe("host to tenant (layer 1)", () => {
  it("maps configured hosts and wildcard subdomains, never reserved names", async () => {
    expect((await tenantForHost("demo.localhost:3100", cfg()))?.slug).toBe("demo");
    expect((await tenantForHost("acme.localhost:3100", cfg()))?.slug).toBe("acme");
    expect(await tenantForHost("ops.localhost:3100", cfg())).toBeNull();
    expect(await tenantForHost("admin.localhost:3100", cfg())).toBeNull();
    expect(await tenantForHost("nobody.localhost:3100", cfg())).toBeNull();
    expect(await tenantForHost("evil.example.com", cfg())).toBeNull();
  });

  it("a session issued for one tenant is refused on another tenant's host", async () => {
    const { token } = await startDemoSession(demo, "owner", req);
    const home = await authenticateTenant({ host: "demo.localhost:3100", token, ip: req.ip, cfg: cfg() });
    expect(home.kind).toBe("ok");
    const away = await authenticateTenant({ host: "acme.localhost:3100", token, ip: req.ip, cfg: cfg() });
    expect(away.kind).toBe("signed-out");
  });

  it("an unknown or tampered token is signed out", async () => {
    const r = await authenticateTenant({ host: "demo.localhost:3100", token: "x".repeat(43), ip: req.ip, cfg: cfg() });
    expect(r.kind).toBe("signed-out");
  });

  it("demo sign-in is refused on a non-demo tenant", async () => {
    await expect(startDemoSession(acme, "owner", req)).rejects.toThrow();
  });

  it("dev sign-in only works for members of that tenant", async () => {
    await expect(startDevTenantSession(acme, "dana.reyes@summitbuilders.example", req)).rejects.toThrow();
    const { token } = await startDevTenantSession(acme, "owner@acme.example", req);
    const r = await authenticateTenant({ host: "acme.localhost:3100", token, ip: req.ip, cfg: cfg() });
    expect(r.kind === "ok" && r.ctx.role).toBe("owner");
  });
});
