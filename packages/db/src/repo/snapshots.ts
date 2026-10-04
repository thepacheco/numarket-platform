import type { Db } from "../client";
import { buildDatasets, countRows, ACME_JOBS, SUMMIT_JOBS, type Datasets, type Entry } from "../demo/construction";
import { audit } from "./audit";

/* Serving snapshots (Spec §3.4). Dashboards, reports, and exports read the
   latest published snapshot; viewing never touches the warehouse.

   Publishing for real tenants is done by the worker in Stage B. Until then
   publishSimulated() rebuilds the datasets from the sample model and the
   applied input entries, so the demo behaves end to end. */

export type Snapshot = { version: number; published_at: Date; datasets: Datasets };

export async function latestSnapshot(db: Db): Promise<Snapshot | null> {
  const r = await db.query<Snapshot>("select version, published_at, datasets from snapshots order by version desc limit 1");
  return r.rows[0] ?? null;
}

export async function snapshotVersion(db: Db, version: number): Promise<Snapshot | null> {
  const r = await db.query<Snapshot>("select version, published_at, datasets from snapshots where version = $1", [version]);
  return r.rows[0] ?? null;
}

/* The tenant's share of a dataset for one user (Spec §6.3). Rows are filtered
   on the server by the user's scope. A dataset that has no column for the
   scope dimension is hidden from scoped users entirely (fail closed). */
export type Scope = { dimension: string; values: string[] } | null;

export function scopeRows<T extends Record<string, unknown>>(rows: T[] | undefined, scope: Scope): T[] {
  if (!rows) return [];
  if (!scope) return rows;
  return rows.filter((r) => scope.dimension in r && scope.values.includes(String(r[scope.dimension])));
}

export function sampleJobsFor(slug: string) {
  return slug === "acme" ? ACME_JOBS : SUMMIT_JOBS;
}

export function simulationAllowed(isDemo: boolean) {
  return isDemo || process.env.NODE_ENV !== "production";
}

type Tenantish = { id: string; slug: string; isDemo: boolean };

/** Rebuild and publish a new snapshot version, applying pending entries. */
export async function publishSimulated(db: Db, tenant: Tenantish, kind: "scheduled" | "manual" | "reset", triggeredBy: string | null, asOf = new Date()) {
  if (!simulationAllowed(tenant.isDemo)) throw new Error("Refreshes for this workspace run through the data pipeline.");
  /* one publish at a time per tenant */
  await db.query("select pg_advisory_xact_lock(hashtext($1))", [tenant.id]);

  const pending = await db.query<{ id: string }>("select id from input_entries where status = 'pending'");
  const entries = await db.query<Entry>(
    `select e.id, e.screen_slug, e.data, e.created_at, u.name as created_by_name
     from input_entries e left join users u on u.id = e.created_by order by e.created_at`,
  );
  const datasets = buildDatasets(sampleJobsFor(tenant.slug), entries.rows, asOf);
  const v = await db.query<{ v: number }>("select coalesce(max(version), 0) + 1 as v from snapshots");
  const version = v.rows[0].v;
  const run = await db.query<{ id: string }>(
    `insert into refresh_runs (tenant_id, kind, triggered_by, entries_applied, rows_published, snowflake_credits, status, finished_at)
     values (current_tenant(), $1, $2, $3, $4, 0, 'succeeded', now()) returning id`,
    [kind, triggeredBy, pending.rows.length, countRows(datasets)],
  );
  await db.query("insert into snapshots (tenant_id, version, datasets, refresh_run_id) values (current_tenant(), $1, $2, $3)", [version, JSON.stringify(datasets), run.rows[0].id]);
  if (pending.rows.length) {
    await db.query("update input_entries set status = 'applied', applied_in_version = $1 where status = 'pending'", [version]);
  }
  await db.query("update sources set last_sync_at = now() where provider = 'portal'");
  await audit(db, {
    tenantId: tenant.id,
    actorUserId: triggeredBy,
    actorKind: triggeredBy ? "user" : "system",
    action: kind === "manual" ? "refresh.update_now" : kind === "reset" ? "refresh.reset" : "refresh.scheduled",
    target: `v${version}`,
    detail: { entries_applied: pending.rows.length },
  });
  return { version, entriesApplied: pending.rows.length };
}

export async function pendingEntryCount(db: Db) {
  const r = await db.query<{ n: number; oldest: Date | null }>("select count(*)::int as n, min(created_at) as oldest from input_entries where status = 'pending'");
  return r.rows[0];
}

export async function manualRefreshesToday(db: Db, timeZone: string) {
  const r = await db.query<{ n: number }>(
    "select count(*)::int as n from refresh_runs where kind = 'manual' and (started_at at time zone $1)::date = (now() at time zone $1)::date",
    [timeZone],
  );
  return r.rows[0].n;
}

export async function recentRuns(db: Db, limit = 10) {
  const r = await db.query<{ id: string; kind: string; started_at: Date; entries_applied: number; rows_published: number; snowflake_credits: string; status: string; by_name: string | null }>(
    `select r.id, r.kind, r.started_at, r.entries_applied, r.rows_published, r.snowflake_credits, r.status, u.name as by_name
     from refresh_runs r left join users u on u.id = r.triggered_by order by r.started_at desc limit $1`,
    [limit],
  );
  return r.rows;
}
