import type { Db } from "../client";

/* Tenant-scoped reads and writes for the Workspace and Foundation pages. Every
   function runs inside withTenant(), so row-level security limits it to the
   tenant of the request. Callers check permissions before calling. */

/* ---------- dashboards ---------- */
export type DashboardRow = { slug: string; title: string; description: string; layout: unknown };
export async function listDashboards(db: Db) {
  return (await db.query<DashboardRow>("select slug, title, description, layout from dashboards order by sort, title")).rows;
}
export async function getDashboard(db: Db, slug: string) {
  return (await db.query<DashboardRow>("select slug, title, description, layout from dashboards where slug = $1", [slug])).rows[0] ?? null;
}

/* ---------- definitions ---------- */
export type DefinitionRow = { key: string; name: string; means: string; formula: string; sources: string; owner: string; updated_at: Date };
export async function listDefinitions(db: Db) {
  return (await db.query<DefinitionRow>("select key, name, means, formula, sources, owner, updated_at from definitions order by name")).rows;
}
export async function suggestDefinition(db: Db, key: string, body: string, userId: string) {
  await db.query("insert into definition_suggestions (tenant_id, key, body, suggested_by) values (current_tenant(), $1, $2, $3)", [key, body, userId]);
}
export async function countSuggestions(db: Db) {
  return (await db.query<{ key: string; n: number }>("select key, count(*)::int as n from definition_suggestions group by key")).rows;
}

/* ---------- input screens ---------- */
export type FieldDef = {
  key: string;
  label: string;
  type: "select" | "date" | "number" | "text";
  required?: boolean;
  options?: string[] | "jobs";
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
  help?: string;
  minDaysAgo?: number;
};
export type ScreenRow = { slug: string; title: string; description: string; fields: FieldDef[] };
export async function listScreens(db: Db) {
  return (await db.query<ScreenRow>("select slug, title, description, fields from input_screens order by sort, title")).rows;
}
export async function getScreen(db: Db, slug: string) {
  return (await db.query<ScreenRow>("select slug, title, description, fields from input_screens where slug = $1", [slug])).rows[0] ?? null;
}
export type EntryRow = { id: string; screen_slug: string; data: Record<string, unknown>; created_at: Date; status: string; applied_in_version: number | null; by_name: string | null; created_by: string | null };
export async function listEntries(db: Db, opts: { screen?: string; userId?: string; limit?: number }) {
  const r = await db.query<EntryRow>(
    `select e.id, e.screen_slug, e.data, e.created_at, e.status, e.applied_in_version, e.created_by, u.name as by_name
     from input_entries e left join users u on u.id = e.created_by
     where ($1::text is null or e.screen_slug = $1) and ($2::uuid is null or e.created_by = $2)
     order by e.created_at desc limit $3`,
    [opts.screen ?? null, opts.userId ?? null, Math.min(opts.limit ?? 50, 200)],
  );
  return r.rows;
}
export async function insertEntry(db: Db, screen: string, data: Record<string, unknown>, userId: string) {
  const r = await db.query<{ id: string }>("insert into input_entries (tenant_id, screen_slug, data, created_by) values (current_tenant(), $1, $2, $3) returning id", [screen, JSON.stringify(data), userId]);
  return r.rows[0].id;
}
export async function deletePendingEntry(db: Db, id: string, userId: string, any: boolean) {
  const r = await db.query("delete from input_entries where id = $1 and status = 'pending' and ($3 or created_by = $2)", [id, userId, any]);
  return r.rowCount === 1;
}

/** Server-side validation of one entry against its screen's fields. */
export function validateEntry(fields: FieldDef[], raw: Record<string, string>, ctx: { jobs: string[]; today: string }) {
  const data: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const v = (raw[f.key] ?? "").trim();
    if (!v) {
      if (f.required) errors[f.key] = `${f.label} is required.`;
      continue;
    }
    if (f.type === "select") {
      const opts = f.options === "jobs" ? ctx.jobs : f.options ?? [];
      if (!opts.includes(v)) errors[f.key] = `Choose a valid ${f.label.toLowerCase()}.`;
      else data[f.key] = v;
    } else if (f.type === "number") {
      const n = Number(v.replace(/,/g, ""));
      if (!Number.isFinite(n)) errors[f.key] = `${f.label} must be a number.`;
      else if (f.min !== undefined && n < f.min) errors[f.key] = `${f.label} must be at least ${f.min.toLocaleString("en-US")}.`;
      else if (f.max !== undefined && n > f.max) errors[f.key] = `${f.label} can't be more than ${f.max.toLocaleString("en-US")}.`;
      else data[f.key] = n;
    } else if (f.type === "date") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) errors[f.key] = `${f.label} must be a date.`;
      else if (v > ctx.today) errors[f.key] = `${f.label} can't be in the future.`;
      else if (f.minDaysAgo !== undefined && daysBetween(v, ctx.today) > f.minDaysAgo) errors[f.key] = `${f.label} must be within the last ${f.minDaysAgo} days.`;
      else data[f.key] = v;
    } else {
      if (f.maxLength && v.length > f.maxLength) errors[f.key] = `${f.label} must be ${f.maxLength} characters or fewer.`;
      else data[f.key] = v;
    }
  }
  return { data, errors, ok: Object.keys(errors).length === 0 };
}
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/* ---------- reports ---------- */
export type ReportRow = { slug: string; title: string; description: string; layout: ReportLayout; draft: Record<string, string>; draft_updated_at: Date | null; draft_by: string | null };
export type ReportLayout = {
  prepared_for?: string | null;
  job?: string | null;
  /* the reporting cadence shown on the cover, e.g. "week" */
  period?: string;
  sections: ({ type: "kpis"; blocks: unknown[] } | { type: "commentary"; key: string; title: string; placeholder?: string } | { type: "block"; block: unknown })[];
};
export async function listReports(db: Db) {
  return (
    await db.query<ReportRow & { latest_version: number | null; latest_at: Date | null }>(
      `select r.slug, r.title, r.description, r.layout, r.draft, r.draft_updated_at, null as draft_by,
              (select max(version) from report_versions v where v.report_slug = r.slug) as latest_version,
              (select max(published_at) from report_versions v where v.report_slug = r.slug) as latest_at
       from reports r order by r.sort, r.title`,
    )
  ).rows;
}
export async function getReport(db: Db, slug: string) {
  return (
    await db.query<ReportRow>(
      `select r.slug, r.title, r.description, r.layout, r.draft, r.draft_updated_at, u.name as draft_by
       from reports r left join users u on u.id = r.draft_updated_by where r.slug = $1`,
      [slug],
    )
  ).rows[0] ?? null;
}
export type ReportVersionRow = { version: number; commentary: Record<string, string>; snapshot_version: number; published_at: Date; by_name: string | null };
export async function reportVersions(db: Db, slug: string) {
  return (
    await db.query<ReportVersionRow>(
      `select v.version, v.commentary, v.snapshot_version, v.published_at, u.name as by_name
       from report_versions v left join users u on u.id = v.published_by where v.report_slug = $1 order by v.version desc`,
      [slug],
    )
  ).rows;
}
export async function saveDraft(db: Db, slug: string, draft: Record<string, string>, userId: string) {
  await db.query("update reports set draft = $2, draft_updated_by = $3, draft_updated_at = now() where slug = $1", [slug, JSON.stringify(draft), userId]);
}
export async function publishReport(db: Db, slug: string, commentary: Record<string, string>, snapshotVersion: number, userId: string) {
  const r = await db.query<{ v: number }>("select coalesce(max(version), 0) + 1 as v from report_versions where report_slug = $1", [slug]);
  const version = r.rows[0].v;
  await db.query(
    "insert into report_versions (tenant_id, report_slug, version, commentary, snapshot_version, published_by) values (current_tenant(), $1, $2, $3, $4, $5)",
    [slug, version, JSON.stringify(commentary), snapshotVersion, userId],
  );
  return version;
}

/* ---------- flags ----------
   A flag records what the data says and how it was settled. The Portal is
   not a task or messaging tool: no assignments, no comment threads. */
export type FlagRow = {
  id: string; title: string; detail: string; source: string; job: string | null; severity: string; question: string | null; options: string[] | null;
  status: string; resolution: string | null; resolved_at: Date | null; resolved_by_name: string | null; created_at: Date;
};
export async function listFlags(db: Db) {
  return (
    await db.query<FlagRow>(
      `select f.id, f.title, f.detail, f.source, f.job, f.severity, f.question, f.options, f.status, f.resolution, f.resolved_at,
              rb.name as resolved_by_name, f.created_at
       from flags f left join users rb on rb.id = f.resolved_by
       order by case f.status when 'open' then 0 else 1 end, case f.severity when 'urgent' then 0 when 'review' then 1 else 2 end, f.created_at desc`,
    )
  ).rows;
}
export async function getFlag(db: Db, id: string) {
  return (await db.query<{ id: string; job: string | null; status: string; options: string[] | null; title: string }>("select id, job, status, options, title from flags where id = $1", [id])).rows[0] ?? null;
}
export async function resolveFlag(db: Db, id: string, status: "resolved" | "correct" | "open", resolution: string | null, userId: string) {
  await db.query(
    `update flags set status = $2, resolution = $3, resolved_by = case when $2 = 'open' then null else $4::uuid end,
     resolved_at = case when $2 = 'open' then null else now() end where id = $1`,
    [id, status, resolution, userId],
  );
}

/* ---------- Insight Review ---------- */
export type ReviewContent = {
  summary: string;
  changed: { metric: string; value: string; change: string; note: string }[];
  risks: { title: string; detail: string }[];
  recommendations: { title: string; detail: string; owner: string; due: string }[];
  usage: { rows: string; allowance: string; note: string };
  next: string;
};
export type ReviewRow = { id: string; period: string; title: string; analyst: string; published_at: Date; content: ReviewContent };
export async function listReviews(db: Db) {
  return (await db.query<ReviewRow>("select id, period, title, analyst, published_at, content from reviews order by period desc")).rows;
}
export async function getReview(db: Db, id: string) {
  const ok = /^[0-9a-f-]{36}$/i.test(id);
  return ok ? ((await db.query<ReviewRow>("select id, period, title, analyst, published_at, content from reviews where id = $1", [id])).rows[0] ?? null) : null;
}

/* ---------- Home layout (per person) ---------- */
export type HomeLayout = { kpis: string[]; charts: string[]; panels: string[] };
export async function getHomeLayout(db: Db, userId: string) {
  return (await db.query<{ layout: HomeLayout }>("select layout from home_layouts where user_id = $1", [userId])).rows[0]?.layout ?? null;
}
export async function saveHomeLayout(db: Db, userId: string, layout: HomeLayout | null) {
  if (!layout) await db.query("delete from home_layouts where user_id = $1", [userId]);
  else
    await db.query(
      `insert into home_layouts (tenant_id, user_id, layout) values (current_tenant(), $1, $2)
       on conflict (tenant_id, user_id) do update set layout = excluded.layout, updated_at = now()`,
      [userId, JSON.stringify(layout)],
    );
}

/* ---------- sources and data health ---------- */
export type SourceRow = { id: string; provider: string; name: string; tier: string; connection: string; status: string; last_sync_at: Date | null; next_sync_at: Date | null; rows_loaded: string; streams: string[] };
export async function listSources(db: Db) {
  return (await db.query<SourceRow>("select id, provider, name, tier, connection, status, last_sync_at, next_sync_at, rows_loaded, streams from sources order by sort, name")).rows;
}
export type CheckRow = { id: string; name: string; source: string; status: "pass" | "warn" | "fail"; detail: string; last_run_at: Date };
export async function listChecks(db: Db) {
  return (await db.query<CheckRow>("select id, name, source, status, detail, last_run_at from data_checks order by case status when 'fail' then 0 when 'warn' then 1 else 2 end, name")).rows;
}
