import type { Db } from "../client";

/* Tenant admin reads and writes (Spec §12.6). Callers check permissions and
   block changes on demo workspaces before calling. */

export type MemberRow = {
  user_id: string; name: string; email: string; title: string | null; role: string; scope_dimension: string | null; scope_values: string[] | null;
  status: string; persona: string | null; last_sign_in_at: Date | null;
};
export async function listMembers(db: Db) {
  return (
    await db.query<MemberRow>(
      `select m.user_id, u.name, u.email, u.title, m.role, m.scope_dimension, m.scope_values, m.status, m.persona, m.last_sign_in_at
       from memberships m join users u on u.id = m.user_id
       order by case m.status when 'active' then 0 when 'invited' then 1 else 2 end,
                case m.role when 'owner' then 0 when 'admin' then 1 when 'editor' then 2 when 'contributor' then 3 else 4 end, u.name`,
    )
  ).rows;
}

export async function ownerCount(db: Db) {
  return (await db.query<{ n: number }>("select count(*)::int as n from memberships where role = 'owner' and status = 'active'")).rows[0].n;
}

export async function updateMember(db: Db, userId: string, patch: { role?: string; scopeValues?: string[] | null; status?: string }) {
  const cur = (await db.query<{ role: string; status: string }>("select role, status from memberships where user_id = $1", [userId])).rows[0];
  if (!cur) throw new Error("No such member.");
  /* A workspace must always keep at least one active Owner (Spec §4.3). */
  const losingOwner = cur.role === "owner" && cur.status === "active" && ((patch.role && patch.role !== "owner") || (patch.status && patch.status !== "active"));
  if (losingOwner && (await ownerCount(db)) <= 1) throw new Error("A workspace must keep at least one Owner.");
  await db.query(
    `update memberships set role = coalesce($2, role),
       scope_dimension = case when $4 then (case when $3::text[] is null then null else 'job' end) else scope_dimension end,
       scope_values = case when $4 then $3::text[] else scope_values end,
       status = coalesce($5, status)
     where user_id = $1`,
    [userId, patch.role ?? null, patch.scopeValues ?? null, patch.scopeValues !== undefined, patch.status ?? null],
  );
}

export type PolicyRow = {
  allowed_methods: string[]; require_mfa: boolean; allowed_email_domains: string[]; ip_allowlist: string[];
  session_hours: number; idle_minutes: number; export_roles: string[]; require_approval: boolean; updated_at: Date;
};
export async function getPolicy(db: Db) {
  return (await db.query<PolicyRow>("select * from security_policies")).rows[0] ?? null;
}
export async function updatePolicy(db: Db, p: Omit<PolicyRow, "updated_at">) {
  await db.query(
    `update security_policies set allowed_methods = $1, require_mfa = $2, allowed_email_domains = $3, ip_allowlist = $4,
       session_hours = $5, idle_minutes = $6, export_roles = $7, require_approval = $8, updated_at = now()`,
    [p.allowed_methods, p.require_mfa, p.allowed_email_domains, p.ip_allowlist, p.session_hours, p.idle_minutes, p.export_roles, p.require_approval],
  );
}

export type BrandingRow = { display_name: string; primary_color: string; accent_color: string; logo_text: string | null; signin_message: string | null; report_footer: string | null };
export async function getBranding(db: Db) {
  return (await db.query<BrandingRow>("select display_name, primary_color, accent_color, logo_text, signin_message, report_footer from branding")).rows[0] ?? null;
}
export async function updateBranding(db: Db, b: BrandingRow) {
  await db.query(
    `update branding set display_name = $1, primary_color = $2, accent_color = $3, logo_text = $4, signin_message = $5, report_footer = $6, updated_at = now()`,
    [b.display_name, b.primary_color, b.accent_color, b.logo_text, b.signin_message, b.report_footer],
  );
}

export async function usageCounts(db: Db) {
  return (
    await db.query<{ users: number; sources: number; dashboards: number; screens: number; reports: number; entries_30d: number; refreshes_30d: number }>(
      `select (select count(*)::int from memberships where status = 'active') as users,
              (select count(*)::int from sources where tier <> 'internal') as sources,
              (select count(*)::int from dashboards) as dashboards,
              (select count(*)::int from input_screens) as screens,
              (select count(*)::int from reports) as reports,
              (select count(*)::int from input_entries where created_at > now() - interval '30 days') as entries_30d,
              (select count(*)::int from refresh_runs where started_at > now() - interval '30 days') as refreshes_30d`,
    )
  ).rows[0];
}
