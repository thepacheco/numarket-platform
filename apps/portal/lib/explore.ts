import { fmt, resolveRange, runDataReport, tableTotals, validYm, visibleRows, type Column, type DataReportDef, type Datasets, type RangeSel, type Rows } from "@numarket/blocks";
import type { Scope } from "@numarket/db/repo/snapshots";

/* Explore: one view of the data for one person. Their scope, period, job,
   grouping, find text, and column filters, applied to the published snapshot
   (never the warehouse). The same function serves the page, the download,
   saved views, and alerts made from a view, so they always agree. */

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? undefined;

export type WhereOp = "gt" | "lt" | "eq" | "has";
export type Where = { field: string; op: WhereOp; value: string };
export const OPS: Record<WhereOp, string> = { gt: "is more than", lt: "is less than", eq: "is", has: "contains" };

export type RunState = { range: RangeSel | null; job: string | undefined; grouping: DataReportDef["groupings"][number]; jobs: { v: string; l: string }[]; find: string | undefined; where: Where[] };

export const isNumeric = (c?: Column) => !!c?.format && ["money", "num", "pct", "hours", "dec2", "over"].includes(c.format);
const clean = (s: string) => s.replace(/[|~]/g, " ").trim().slice(0, 60);

/** Column filters travel in one URL value: "field~op~value|field~op~value". */
export function parseWhere(raw: string | undefined, columns: Column[]): Where[] {
  if (!raw) return [];
  return raw
    .split("|")
    .map((p) => p.split("~"))
    .map(([field, op, value]) => ({ field, op: op as WhereOp, value: clean(value ?? "") }))
    .filter((w) => columns.some((c) => c.field === w.field) && w.op in OPS && w.value !== "")
    .filter((w) => (w.op === "gt" || w.op === "lt" ? Number.isFinite(Number(w.value)) : true))
    .slice(0, 4);
}
export const whereParam = (ws: Where[]) => ws.map((w) => `${w.field}~${w.op}~${clean(w.value)}`).join("|");

export function applyWhere(rows: Rows, where: Where[], columns: Column[]): Rows {
  if (!where.length) return rows;
  const col = (f: string) => columns.find((c) => c.field === f);
  return rows.filter((r) =>
    where.every((w) => {
      const v = r[w.field];
      if (w.op === "gt") return Number(v) > Number(w.value);
      if (w.op === "lt") return Number(v) < Number(w.value);
      const shown = fmt(v, col(w.field)?.format, { full: true }).toLowerCase();
      const raw = String(v ?? "").toLowerCase();
      const want = w.value.toLowerCase();
      return w.op === "eq" ? raw === want || shown === want : raw.includes(want) || shown.includes(want);
    }),
  );
}

export function runState(def: DataReportDef, datasets: Datasets, scope: Scope, params: Params, asOfMonth: string): RunState {
  const range = def.filters.date ? resolveRange(asOfMonth, one(params.range), one(params.from), one(params.to)) : null;
  const jobs = def.filters.job ? visibleRows(datasets, "job_summary", scope).map((r) => ({ v: String(r.job), l: String(r.name) })) : [];
  const j = one(params.job);
  const grouping = def.groupings.find((g) => g.key === one(params.group)) ?? def.groupings[0];
  const find = one(params.find)?.trim().slice(0, 60) || undefined;
  return { range, job: j && jobs.some((x) => x.v === j) ? j : undefined, grouping, jobs, find, where: parseWhere(one(params.w), grouping.columns) };
}

export function run(def: DataReportDef, datasets: Datasets, scope: Scope, st: RunState) {
  const rows = visibleRows(datasets, def.dataset, scope, { eq: { job: st.job }, range: st.range?.current ?? null });
  const out = runDataReport(def, st.grouping, rows);
  if (!st.find && !st.where.length) return out;
  /* "find" keeps rows where any column, as shown, contains the text */
  const f = st.find?.toLowerCase();
  const found = f ? out.rows.filter((r) => st.grouping.columns.some((c) => fmt(r[c.field], c.format, { full: true }).toLowerCase().includes(f) || String(r[c.field] ?? "").toLowerCase().includes(f))) : out.rows;
  const kept = applyWhere(found, st.where, st.grouping.columns);
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
    w: st.where.length ? whereParam(st.where) : undefined,
    ...over,
  };
  for (const [k, x] of Object.entries(v)) if (x && (k !== "from" && k !== "to" ? true : validYm(x))) q.set(k, x);
  return q.toString();
}

/** A row's identity for "tell me when something new shows up": its words, not its numbers (those change every day). */
export function rowKey(row: Record<string, unknown>, columns: Column[]) {
  const parts = columns.filter((c) => !isNumeric(c) && c.format !== "date").map((c) => String(row[c.field] ?? ""));
  return (parts.length ? parts : columns.map((c) => String(row[c.field] ?? ""))).join("·").slice(0, 160);
}

/** Plain words for what a view shows, e.g. "Open RFIs · Route 9 Bridge · Days open is more than 21". */
export function describeView(title: string, st: RunState) {
  const parts = [title];
  if (st.job) parts.push(st.jobs.find((j) => j.v === st.job)?.l ?? st.job);
  if (st.find) parts.push(`containing "${st.find}"`);
  for (const w of st.where) parts.push(`${st.grouping.columns.find((c) => c.field === w.field)?.label ?? w.field} ${OPS[w.op]} ${w.value}`);
  return parts.join(" · ");
}
