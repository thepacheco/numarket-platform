import "server-only";
import { fmt, resolveRange, runDataReport, tableTotals, validYm, visibleRows, type DataReportDef, type Datasets, type RangeSel } from "@numarket/blocks";
import type { TenantContext } from "@numarket/auth";
import type { Params } from "@/components/Dashboard";

/* Runs one data report for one person: their scope, their period, job, and
   grouping. Reads the published snapshot, never the warehouse. */
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? undefined;

export type RunState = { range: RangeSel | null; job: string | undefined; grouping: DataReportDef["groupings"][number]; jobs: { v: string; l: string }[]; find: string | undefined };

export function runState(def: DataReportDef, datasets: Datasets, ctx: TenantContext, params: Params, asOfMonth: string): RunState {
  const range = def.filters.date ? resolveRange(asOfMonth, one(params.range), one(params.from), one(params.to)) : null;
  const jobs = def.filters.job ? visibleRows(datasets, "job_summary", ctx.scope).map((r) => ({ v: String(r.job), l: String(r.name) })) : [];
  const j = one(params.job);
  const grouping = def.groupings.find((g) => g.key === one(params.group)) ?? def.groupings[0];
  const find = one(params.find)?.trim().slice(0, 60) || undefined;
  return { range, job: j && jobs.some((x) => x.v === j) ? j : undefined, grouping, jobs, find };
}

export function run(def: DataReportDef, datasets: Datasets, ctx: TenantContext, st: RunState) {
  const rows = visibleRows(datasets, def.dataset, ctx.scope, { eq: { job: st.job }, range: st.range?.current ?? null });
  const out = runDataReport(def, st.grouping, rows);
  if (!st.find) return out;
  /* "find" keeps rows where any column, as shown, contains the text */
  const f = st.find.toLowerCase();
  const kept = out.rows.filter((r) => st.grouping.columns.some((c) => fmt(r[c.field], c.format, { full: true }).toLowerCase().includes(f) || String(r[c.field] ?? "").toLowerCase().includes(f)));
  return { ...out, rows: kept, totals: tableTotals(out.block, kept) };
}

export function runQuery(st: RunState, over: Record<string, string | undefined> = {}) {
  const q = new URLSearchParams();
  const v: Record<string, string | undefined> = {
    group: st.grouping.key,
    range: st.range?.key,
    from: st.range?.key === "custom" ? st.range.current.from : undefined,
    to: st.range?.key === "custom" ? st.range.current.to : undefined,
    job: st.job,
    find: st.find,
    ...over,
  };
  for (const [k, x] of Object.entries(v)) if (x && (k !== "from" && k !== "to" ? true : validYm(x))) q.set(k, x);
  return q.toString();
}
