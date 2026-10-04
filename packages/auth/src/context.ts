import { withPlatform, withTenant } from "@numarket/db";
import { slugFromSubdomain, type HostConfig } from "./hosts";
import { can, isRole, ROLE_PERMISSIONS, type Permission, type Role } from "./permissions";
import { evaluatePolicy, type PolicyResult, type SecurityPolicy } from "./policy";
import { findSession, touchSession, type SessionRow } from "./session";

/* Turns (host, session token, client IP) into who is asking and what they may
   do. Pure of any framework, so the isolation tests call it directly.

   Layer 1 of tenant isolation lives here: the tenant comes from the host, and
   a session only counts if it was issued for that same tenant. */

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  tier: "insight" | "operate" | "command";
  products: string[];
  isDemo: boolean;
  status: string;
  timezone: string;
};

export type Scope = { dimension: string; values: string[] } | null;

export type TenantUser = { id: string; email: string; name: string; title: string | null };

export type TenantContext = {
  tenant: Tenant;
  user: TenantUser;
  role: Role;
  scope: Scope;
  persona: string | null;
  session: SessionRow;
  policy: SecurityPolicy;
  can: (p: Permission) => boolean;
};

export type TenantAuth =
  | { kind: "no-tenant" }
  | { kind: "signed-out"; tenant: Tenant }
  | { kind: "blocked"; tenant: Tenant; reason: Exclude<PolicyResult, { ok: true }>["reason"] }
  | { kind: "ok"; ctx: TenantContext };

type TenantRow = { id: string; slug: string; name: string; tier: Tenant["tier"]; products: string[]; is_demo: boolean; status: string; timezone: string };
const toTenant = (r: TenantRow): Tenant => ({ id: r.id, slug: r.slug, name: r.name, tier: r.tier, products: r.products, isDemo: r.is_demo, status: r.status, timezone: r.timezone });

export async function tenantForHost(host: string, cfg: HostConfig): Promise<Tenant | null> {
  return withPlatform(async (db) => {
    const cols = "t.id, t.slug, t.name, t.tier, t.products, t.is_demo, t.status, t.timezone";
    let r = await db.query<TenantRow>(`select ${cols} from tenant_hosts h join tenants t on t.id = h.tenant_id where h.host = $1`, [host]);
    if (!r.rows[0]) {
      const slug = slugFromSubdomain(host, cfg);
      if (slug) r = await db.query<TenantRow>(`select ${cols} from tenants t where t.slug = $1`, [slug]);
    }
    const row = r.rows[0];
    return row && row.status !== "offboarding" ? toTenant(row) : null;
  });
}

export async function tenantBySlug(slug: string): Promise<Tenant | null> {
  return withPlatform(async (db) => {
    const r = await db.query<TenantRow>("select id, slug, name, tier, products, is_demo, status, timezone from tenants where slug = $1", [slug]);
    return r.rows[0] ? toTenant(r.rows[0]) : null;
  });
}

type PolicyRow = {
  allowed_methods: SecurityPolicy["allowedMethods"];
  require_mfa: boolean;
  allowed_email_domains: string[];
  ip_allowlist: string[];
  session_hours: number;
  idle_minutes: number;
  export_roles: string[];
  require_approval: boolean;
};
export const toPolicy = (p: PolicyRow): SecurityPolicy => ({
  allowedMethods: p.allowed_methods,
  requireMfa: p.require_mfa,
  allowedEmailDomains: p.allowed_email_domains,
  ipAllowlist: p.ip_allowlist,
  sessionHours: p.session_hours,
  idleMinutes: p.idle_minutes,
  exportRoles: p.export_roles,
  requireApproval: p.require_approval,
});

export async function loadPolicy(tenantId: string): Promise<SecurityPolicy | null> {
  return withTenant(tenantId, async (db) => {
    const r = await db.query<PolicyRow>("select * from security_policies");
    return r.rows[0] ? toPolicy(r.rows[0]) : null;
  });
}

export async function authenticateTenant(input: { host: string; token: string | null | undefined; ip: string | null; cfg: HostConfig; now?: Date }): Promise<TenantAuth> {
  const tenant = await tenantForHost(input.host, input.cfg);
  if (!tenant) return { kind: "no-tenant" };
  if (tenant.status !== "active") return { kind: "signed-out", tenant };

  const session = await findSession(input.token, "tenant");
  if (!session || session.tenant_id !== tenant.id) return { kind: "signed-out", tenant };

  const loaded = await withTenant(
    tenant.id,
    async (db) => {
      const m = await db.query<{ role: string; scope_dimension: string | null; scope_values: string[] | null; persona: string | null; status: string }>(
        "select role, scope_dimension, scope_values, persona, status from memberships where user_id = $1",
        [session.user_id],
      );
      const u = await db.query<TenantUser>("select id, email, name, title from users where id = $1", [session.user_id]);
      const p = await db.query<PolicyRow>("select * from security_policies");
      return { m: m.rows[0], u: u.rows[0], p: p.rows[0] };
    },
    { userId: session.user_id },
  );
  if (!loaded.m || loaded.m.status !== "active" || !loaded.u || !loaded.p || !isRole(loaded.m.role)) return { kind: "signed-out", tenant };

  const policy = toPolicy(loaded.p);
  const verdict = evaluatePolicy(policy, { method: session.method, mfa: session.mfa, createdAt: session.created_at, lastSeenAt: session.last_seen_at }, input.ip, input.now);
  if (!verdict.ok) return { kind: "blocked", tenant, reason: verdict.reason };

  await touchSession(session.id_hash, session.last_seen_at);
  const role = loaded.m.role as Role;
  return {
    kind: "ok",
    ctx: {
      tenant,
      user: loaded.u,
      role,
      scope: loaded.m.scope_dimension && loaded.m.scope_values ? { dimension: loaded.m.scope_dimension, values: loaded.m.scope_values } : null,
      persona: loaded.m.persona,
      session,
      policy,
      can: (p: Permission) => can(role, p),
    },
  };
}

export type StaffContext = { user: TenantUser; platformRole: string; session: SessionRow };

export async function authenticateStaff(token: string | null | undefined): Promise<StaffContext | null> {
  const session = await findSession(token, "ops");
  if (!session) return null;
  if (session.method === "dev" && process.env.NODE_ENV === "production") return null;
  const row = await withPlatform(
    async (db) => {
      const r = await db.query<TenantUser & { platform_role: string }>(
        "select u.id, u.email, u.name, u.title, s.platform_role from users u join staff s on s.user_id = u.id where u.id = $1",
        [session.user_id],
      );
      return r.rows[0];
    },
    { userId: session.user_id },
  );
  if (!row) return null;
  await touchSession(session.id_hash, session.last_seen_at);
  return { user: { id: row.id, email: row.email, name: row.name, title: row.title }, platformRole: row.platform_role, session };
}

export { ROLE_PERMISSIONS };
