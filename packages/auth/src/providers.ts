import { withProvisioner, withPlatform, withTenant } from "@numarket/db";
import { audit } from "@numarket/db/repo/audit";
import type { Tenant } from "./context";
import { createSession } from "./session";
import { sandboxCodeOk } from "./sandbox";

/* Sign-in providers, behind one interface so the managed provider (WorkOS
   AuthKit by default, Spec §4.1) can be plugged in without touching the rest.

   Stage A ships two:
   - demo: one-click sign-in as a seeded persona, only on tenants flagged
     is_demo whose policy allows the "demo" method.
   - dev:  local development only (ALLOW_DEV_SIGNIN=1 and not production).
   Real users sign in through the auth provider once it is configured;
   numarket never stores passwords or builds its own MFA. */

export type AuthProviderStatus = { id: "workos"; configured: boolean };

export function authProviderStatus(): AuthProviderStatus {
  return { id: "workos", configured: Boolean(process.env.AUTH_API_KEY && process.env.AUTH_CLIENT_ID) };
}

export function devSignInEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_SIGNIN === "1";
}

type Req = { ip: string | null; userAgent: string | null };

export type DemoPersona = { userId: string; persona: string; name: string; title: string | null; role: string; scopeValues: string[] | null };

export async function demoPersonas(tenant: Tenant): Promise<DemoPersona[]> {
  if (!tenant.isDemo) return [];
  return withTenant(tenant.id, async (db) => {
    const r = await db.query<{ user_id: string; persona: string; name: string; title: string | null; role: string; scope_values: string[] | null }>(
      `select m.user_id, m.persona, u.name, u.title, m.role, m.scope_values
       from memberships m join users u on u.id = m.user_id
       where m.persona is not null and m.status = 'active'
       order by case m.role when 'owner' then 0 when 'admin' then 1 when 'editor' then 2 when 'contributor' then 3 else 4 end`,
    );
    return r.rows.map((x) => ({ userId: x.user_id, persona: x.persona, name: x.name, title: x.title, role: x.role, scopeValues: x.scope_values }));
  });
}

export async function startDemoSession(tenant: Tenant, persona: string, req: Req, opts: { sandboxCode?: string | null } = {}) {
  if (!tenant.isDemo) throw new Error("demo sign-in is only available on demo workspaces");
  /* a prospect sandbox opens only with its access code */
  if (tenant.sandboxUntil && !(await sandboxCodeOk(tenant.id, opts.sandboxCode))) throw new Error("sandbox access code required");
  return withTenant(tenant.id, async (db) => {
    const pol = await db.query<{ allowed_methods: string[]; session_hours: number }>("select allowed_methods, session_hours from security_policies");
    if (!pol.rows[0]?.allowed_methods.includes("demo")) throw new Error("demo sign-in is not allowed on this workspace");
    const m = await db.query<{ user_id: string }>("select user_id from memberships where persona = $1 and status = 'active'", [persona]);
    const userId = m.rows[0]?.user_id;
    if (!userId) throw new Error("unknown demo persona");
    await db.query("update memberships set last_sign_in_at = now() where user_id = $1", [userId]);
    await audit(db, { tenantId: tenant.id, actorUserId: userId, actorKind: "demo", action: "auth.sign_in", target: persona, detail: { method: "demo" }, ip: req.ip });
    const created = await sessionInPlatform({ userId, surface: "tenant", tenantId: tenant.id, method: "demo", mfa: false, hours: Math.min(pol.rows[0].session_hours, 4), ...req });
    return created;
  });
}

export async function startDevTenantSession(tenant: Tenant, email: string, req: Req) {
  if (!devSignInEnabled()) throw new Error("dev sign-in is disabled");
  const userId = await withTenant(tenant.id, async (db) => {
    const r = await db.query<{ id: string }>(
      "select u.id from users u join memberships m on m.user_id = u.id where u.email = $1 and m.status = 'active'",
      [email.trim().toLowerCase()],
    );
    const id = r.rows[0]?.id;
    if (id) await audit(db, { tenantId: tenant.id, actorUserId: id, actorKind: "user", action: "auth.sign_in", target: email, detail: { method: "dev" }, ip: req.ip });
    return id;
  });
  if (!userId) throw new Error("no member with that email in this workspace");
  return sessionInPlatform({ userId, surface: "tenant", tenantId: tenant.id, method: "dev", mfa: false, hours: 8, ...req });
}

export async function startDevStaffSession(email: string, req: Req) {
  if (!devSignInEnabled()) throw new Error("dev sign-in is disabled");
  const userId = await lookupStaff(email);
  if (!userId) throw new Error("no numarket staff member with that email");
  return sessionInPlatform({ userId, surface: "ops", tenantId: null, method: "dev", mfa: false, hours: 8, ...req });
}

/* Dev only: users are hidden from portal_app unless they belong to the current
   tenant, so the staff lookup runs as the owner. */
async function lookupStaff(email: string) {
  return withProvisioner(async (db) => {
    const r = await db.query<{ user_id: string }>("select s.user_id from staff s where s.user_id in (select id from users where email = $1)", [email.trim().toLowerCase()]);
    return r.rows[0]?.user_id ?? null;
  });
}

function sessionInPlatform(s: Parameters<typeof createSession>[1]) {
  return withPlatform((db) => createSession(db, s));
}
