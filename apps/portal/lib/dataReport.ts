import "server-only";
import { resolveRange, runDataReport, validYm, visibleRows, type DataReportDef, type Datasets, type RangeSel } from "@numarket/blocks";
import type { TenantContext } from "@numarket/auth";
import type { Params } from "@/components/Dashboard";

/* Runs one data report for one person: their scope, their period, job, and
   grouping. Reads the published snapshot, never the warehouse. */
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? undefined;

export type RunState = { range: RangeSel | null; job: string | undefined; grouping: DataReportDef["groupings"][number]; jobs: { v: string; l: string }[] };

export function runState(def: DataReportDef, datasets: Datasets, ctx: TenantContext, params: Params, asOfMonth: string): RunState {
  const range = def.filters.date ? resolveRange(asOfMonth, one(params.range), one(params.from), one(params.to)) : null;
  const jobs = def.filters.job ? visibleRows(datasets, "job_summary", ctx.scope).map((r) => ({ v: String(r.job), l: String(r.name) })) : [];
  const j = one(params.job);
  const grouping = def.groupings.find((g) => g.key === one(params.group)) ?? def.groupings[0];
  return { range, job: j && jobs.some((x) => x.v === j) ? j : undefined, grouping, jobs };
}

export function run(def: DataReportDef, datasets: Datasets, ctx: TenantContext, st: RunState) {
  const rows = visibleRows(datasets, def.dataset, ctx.scope, { eq: { job: st.job }, range: st.range?.current ?? null });
  return runDataReport(def, st.grouping, rows);
}

export function runQuery(st: RunState, over: Record<string, string | undefined> = {}) {
  const q = new URLSearchParams();
  const v: Record<string, string | undefined> = {
    group: st.grouping.key,
    range: st.range?.key,
    from: st.range?.key === "custom" ? st.range.current.from : undefined,
    to: st.range?.key === "custom" ? st.range.current.to : undefined,
    job: st.job,
    ...over,
  };
  for (const [k, x] of Object.entries(v)) if (x && (k !== "from" && k !== "to" ? true : validYm(x))) q.set(k, x);
  return q.toString();
}
