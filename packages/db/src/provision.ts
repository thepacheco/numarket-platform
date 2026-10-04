import { withProvisioner, type Db } from "./client";
import { buildReviews, CATALOG_TABLES, CHECKS, DASHBOARDS, DATA_REPORTS, DEFINITIONS, DEMO_OTHER_MEMBERS, DEMO_PERSONAS, FLAGS, REPORTS, SCREENS, SOURCES } from "./demo/config";
import { latestSnapshot } from "./repo/snapshots";
import { publishSimulated } from "./repo/snapshots";

/* Provisioning of sample workspaces (the demo tenant, and the "acme" test
   tenant used in development and the isolation tests). Runs as the database
   owner with the tenant set, because tenant tables force row-level security
   even for the owner. Real tenants are provisioned by the Stage B wizard. */

export type SampleTenantSpec = {
  slug: string;
  name: string;
  tier: "insight" | "operate" | "command";
  products: string[];
  isDemo: boolean;
  hosts: string[];
  logoText: string;
  members: { email: string; name: string; title: string | null; role: string; scope: string[] | null; persona?: string | null; status?: string }[];
  allowedMethods: string[];
};

export const DEMO_SPEC = (hosts: string[]): SampleTenantSpec => ({
  slug: "demo",
  name: "Summit Builders",
  tier: "operate",
  products: ["foundation", "workspace", "insight"],
  isDemo: true,
  hosts,
  logoText: "SB",
  allowedMethods: ["demo"],
  members: [
    ...DEMO_PERSONAS.map((p) => ({ ...p, persona: p.persona })),
    ...DEMO_OTHER_MEMBERS.map((m) => ({ ...m, scope: null, persona: null })),
  ],
});

export const ACME_SPEC = (hosts: string[]): SampleTenantSpec => ({
  slug: "acme",
  name: "Acme Test Co",
  tier: "insight",
  products: ["foundation", "workspace"],
  isDemo: false,
  hosts,
  logoText: "AC",
  allowedMethods: ["microsoft", "google", "password"],
  members: [
    { email: "owner@acme.example", name: "Alex Acme", title: "Owner", role: "owner", scope: null },
    { email: "viewer@acme.example", name: "Vic Viewer", title: "Analyst", role: "viewer", scope: null },
  ],
});

export async function provisionSampleTenant(spec: SampleTenantSpec): Promise<string> {
  const tenantId = await withProvisioner(async (db) => {
    const r = await db.query<{ id: string }>(
      `insert into tenants (slug, name, tier, products, is_demo) values ($1, $2, $3, $4, $5)
       on conflict (slug) do update set name = excluded.name returning id`,
      [spec.slug, spec.name, spec.tier, spec.products, spec.isDemo],
    );
    const id = r.rows[0].id;
    for (const h of spec.hosts) {
      await db.query("insert into tenant_hosts (host, tenant_id) values ($1, $2) on conflict (host) do update set tenant_id = excluded.tenant_id", [h.toLowerCase(), id]);
    }
    for (const m of spec.members) {
      await db.query("insert into users (email, name, title) values ($1, $2, $3) on conflict (email) do update set name = excluded.name, title = excluded.title", [m.email, m.name, m.title]);
    }
    return id;
  });

  await withProvisioner(
    async (db) => {
      for (const m of spec.members) {
        const u = await db.query<{ id: string }>("select id from users where email = $1", [m.email]);
        await db.query(
          `insert into memberships (tenant_id, user_id, role, scope_dimension, scope_values, status, persona)
           values ($1, $2, $3, $4, $5, $6, $7)
           on conflict (tenant_id, user_id) do update set role = excluded.role, scope_dimension = excluded.scope_dimension,
             scope_values = excluded.scope_values, status = excluded.status, persona = excluded.persona`,
          [tenantId, u.rows[0].id, m.role, m.scope ? "job" : null, m.scope, m.status ?? "active", m.persona ?? null],
        );
      }
      await db.query(
        `insert into security_policies (tenant_id, allowed_methods) values ($1, $2)
         on conflict (tenant_id) do update set allowed_methods = excluded.allowed_methods`,
        [tenantId, spec.allowedMethods],
      );
      await db.query(
        `insert into branding (tenant_id, display_name, logo_text, signin_message, report_footer) values ($1, $2, $3, $4, $5)
         on conflict (tenant_id) do nothing`,
        [tenantId, spec.name, spec.logoText, spec.isDemo ? "This is a sample workspace with fictional data. Pick a person to see what they see." : null, `${spec.name} · Confidential`],
      );
      await seedContent(db, tenantId);
    },
    { tenantId },
  );

  await withProvisioner(async (db) => {
    await publishSimulated(db, { id: tenantId, slug: spec.slug, isDemo: spec.isDemo }, "reset", null);
    await seedReviews(db, tenantId);
  }, { tenantId });
  return tenantId;
}

/* Workspace content: configuration plus sample flags, sources, and checks. */
async function seedContent(db: Db, tenantId: string) {
  /* configuration that is no longer in the sample set is removed */
  await db.query("delete from dashboards where not (slug = any($1))", [DASHBOARDS.map((d) => d.slug)]);
  await db.query("delete from reports where not (slug = any($1))", [REPORTS.map((r) => r.slug)]);
  await db.query("delete from input_screens where not (slug = any($1))", [SCREENS.map((x) => x.slug)]);
  await db.query("delete from data_reports where not (slug = any($1))", [DATA_REPORTS.map((x) => x.slug)]);
  for (const [n, r] of DATA_REPORTS.entries()) {
    await db.query(
      `insert into data_reports (tenant_id, slug, title, description, category, definition, sort) values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (tenant_id, slug) do update set title = excluded.title, description = excluded.description, category = excluded.category, definition = excluded.definition, sort = excluded.sort`,
      [tenantId, r.slug, r.title, r.description, r.category, JSON.stringify(r.definition), n],
    );
  }
  await db.query("delete from catalog_tables");
  for (const [n, t] of CATALOG_TABLES.entries()) {
    await db.query("insert into catalog_tables (tenant_id, dataset, name, title, description, grain, sources, sort) values ($1, $2, $3, $4, $5, $6, $7, $8)", [tenantId, t.dataset, t.name, t.title, t.description, t.grain, t.sources, n]);
  }
  let i = 0;
  for (const d of DASHBOARDS) {
    await db.query(
      `insert into dashboards (tenant_id, slug, title, description, layout, sort) values ($1, $2, $3, $4, $5, $6)
       on conflict (tenant_id, slug) do update set title = excluded.title, description = excluded.description, layout = excluded.layout, sort = excluded.sort`,
      [tenantId, d.slug, d.title, d.description, JSON.stringify(d.layout), i++],
    );
  }
  i = 0;
  for (const s of SCREENS) {
    await db.query(
      `insert into input_screens (tenant_id, slug, title, description, fields, sort) values ($1, $2, $3, $4, $5, $6)
       on conflict (tenant_id, slug) do update set title = excluded.title, description = excluded.description, fields = excluded.fields, sort = excluded.sort`,
      [tenantId, s.slug, s.title, s.description, JSON.stringify(s.fields), i++],
    );
  }
  i = 0;
  for (const r of REPORTS) {
    await db.query(
      `insert into reports (tenant_id, slug, title, description, layout, draft, draft_updated_at, sort) values ($1, $2, $3, $4, $5, $6, now(), $7)
       on conflict (tenant_id, slug) do update set title = excluded.title, description = excluded.description, layout = excluded.layout,
         draft = excluded.draft, draft_updated_at = now(), draft_updated_by = null, sort = excluded.sort`,
      [tenantId, r.slug, r.title, r.description, JSON.stringify(r.layout), JSON.stringify(r.draft), i++],
    );
  }
  for (const d of DEFINITIONS) {
    await db.query(
      `insert into definitions (tenant_id, key, name, means, formula, sources, owner) values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (tenant_id, key) do update set name = excluded.name, means = excluded.means, formula = excluded.formula, sources = excluded.sources, owner = excluded.owner`,
      [tenantId, d.key, d.name, d.means, d.formula, d.sources, d.owner],
    );
  }
  await db.query("delete from flags");
  const now = new Date();
  for (const [n, f] of FLAGS.entries()) {
    await db.query(
      `insert into flags (tenant_id, title, detail, source, job, severity, question, options, status, resolution, resolved_at, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [tenantId, f.title, f.detail, f.source, f.job, f.severity, f.question, f.options, (f as { status?: string }).status ?? "open", (f as { resolution?: string }).resolution ?? null, (f as { status?: string }).status ? now : null, new Date(now.getTime() - (n + 1) * 5 * 3600_000)],
    );
  }
  await db.query("delete from sources");
  for (const [n, s] of SOURCES.entries()) {
    const healthy = s.status === "healthy";
    await db.query(
      `insert into sources (tenant_id, provider, name, tier, connection, status, last_sync_at, next_sync_at, rows_loaded, streams, sort)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [tenantId, s.provider, s.name, s.tier, s.connection, s.status, healthy ? new Date(now.getTime() - 40 * 60_000) : new Date(now.getTime() - 3 * 86_400_000), null, s.rows, s.streams, n],
    );
  }
  await db.query("delete from data_checks");
  for (const c of CHECKS) {
    await db.query("insert into data_checks (tenant_id, name, source, status, detail) values ($1, $2, $3, $4, $5)", [tenantId, c.name, c.source, c.status, c.detail]);
  }
}

/* The analyst's reviews, written against the data just published. */
async function seedReviews(db: Db, tenantId: string) {
  const snap = await latestSnapshot(db);
  if (!snap) return;
  await db.query("delete from reviews");
  const asOf = new Date(snap.published_at);
  for (const r of buildReviews(snap.datasets, asOf)) {
    /* published a few days after the month closes, never in the future */
    const published = new Date(Math.min(Date.now() - 3600_000, new Date(`${r.period}-01T14:00:00Z`).getTime() + 33 * 86_400_000));
    await db.query("insert into reviews (tenant_id, period, title, analyst, published_at, content) values ($1, $2, $3, $4, $5, $6)", [tenantId, r.period, r.title, r.analyst, published, JSON.stringify(r.content)]);
  }
}

/* Nightly (and on demand from the ops console): put the demo workspace back
   to its starting state. Only ever runs on tenants flagged is_demo. */
export async function resetDemoTenant(tenantId: string) {
  await withProvisioner(
    async (db) => {
      const t = await db.query<{ slug: string; is_demo: boolean }>("select slug, is_demo from tenants where id = $1", [tenantId]);
      if (!t.rows[0]?.is_demo) throw new Error("resetDemoTenant: not a demo tenant");
      for (const table of ["input_entries", "report_versions", "definition_suggestions", "home_layouts", "snapshots", "refresh_runs", "audit_log"]) {
        await db.query(`delete from ${table}`);
      }
      await db.query("update branding set primary_color = '#22577A', accent_color = '#38A3A5', display_name = (select name from tenants where id = $1)", [tenantId]);
      await db.query("update security_policies set allowed_methods = '{demo}', require_mfa = true, ip_allowlist = '{}', allowed_email_domains = '{}', session_hours = 12, idle_minutes = 60, require_approval = false");
      await seedContent(db, tenantId);
      await publishSimulated(db, { id: tenantId, slug: t.rows[0].slug, isDemo: true }, "reset", null);
      await seedReviews(db, tenantId);
    },
    { tenantId },
  );
  await withProvisioner((db) => db.query("delete from sessions where tenant_id = $1 and method = 'demo'", [tenantId]));
}
