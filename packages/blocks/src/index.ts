/* The building-block library (Spec §12.3): KPI tile, trend, bar, table, and a
   filter bar. A dashboard or report is a layout of these, stored as data.
   Everything here is pure: it takes a snapshot's datasets plus the user's
   scope and filters, and returns what to draw. */

import { scopeRows, type Scope } from "@numarket/db/repo/snapshots";

export type Format = "money" | "num" | "pct" | "dec2" | "over" | "hours" | "status" | "text" | "date";
export type Agg = { agg: "sum"; field: string } | { agg: "avg"; field: string } | { agg: "ratio"; num: string; den: string } | { agg: "diff"; a: string; b: string } | { agg: "count" };

type Base = { title: string; dataset: string; definition?: string; span?: 1 | 2 | 3 };
export type KpiBlock = Base & { type: "kpi"; value: Agg; format: Format; better?: "up" | "down" };
export type TrendBlock = Base & { type: "trend"; x: string; series: { field: string; label: string }[]; format: Format };
export type BarBlock = Base & { type: "bar"; category: string; value: string; format: Format; limit?: number; keepOrder?: boolean };
export type TableBlock = Base & { type: "table"; columns: { field: string; label: string; format?: Format; definition?: string }[]; limit?: number; sort?: { field: string; dir: "asc" | "desc" } };
export type Block = KpiBlock | TrendBlock | BarBlock | TableBlock;
export type FilterDef = { field: string; label: string; dataset: string; labelField: string };
export type DashboardLayout = { filters?: FilterDef[]; rows: Block[][] };

export type Rows = Record<string, unknown>[];
export type Datasets = Record<string, Rows>;
export type Filters = Record<string, string | undefined>;

/** Rows a user may see from one dataset, after their scope and the page filters. */
export function visibleRows(datasets: Datasets, dataset: string, scope: Scope, filters: Filters = {}): Rows {
  let rows = scopeRows(datasets[dataset], scope);
  for (const [field, value] of Object.entries(filters)) {
    if (value === undefined || value === "") continue;
    rows = rows.filter((r) => !(field in r) || String(r[field]) === value);
  }
  return rows;
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const sum = (rows: Rows, f: string) => rows.reduce((t, r) => t + num(r[f]), 0);

export function computeAgg(rows: Rows, a: Agg): number | null {
  if (a.agg === "count") return rows.length;
  if (!rows.length) return null;
  if (a.agg === "sum") return sum(rows, a.field);
  if (a.agg === "avg") return sum(rows, a.field) / rows.length;
  if (a.agg === "diff") return sum(rows, a.a) - sum(rows, a.b);
  const den = sum(rows, a.den);
  return den === 0 ? null : sum(rows, a.num) / den;
}

export type KpiData = { value: number | null; status: "good" | "risk" | null };
export function kpiData(block: KpiBlock, rows: Rows): KpiData {
  const value = computeAgg(rows, block.value);
  let status: KpiData["status"] = null;
  if (value !== null && block.format === "dec2" && block.better === "up") status = value >= 1 ? "good" : "risk";
  if (value !== null && block.format === "over") status = value <= 0 ? "good" : "risk";
  return { value, status };
}

export function groupSum(rows: Rows, key: string, fields: string[]) {
  const m = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const k = String(r[key]);
    const cur = m.get(k) ?? Object.fromEntries(fields.map((f) => [f, 0]));
    for (const f of fields) cur[f] += num(r[f]);
    m.set(k, cur);
  }
  return [...m.entries()].map(([k, v]) => ({ ...v, key: k }) as Record<string, number> & { key: string });
}

export function barData(block: BarBlock, rows: Rows) {
  const g = groupSum(rows, block.category, [block.value]).map((x) => ({ label: x.key, value: x[block.value] as number }));
  if (!block.keepOrder) g.sort((a, b) => b.value - a.value);
  return block.limit ? g.slice(0, block.limit) : g;
}

export function trendData(block: TrendBlock, rows: Rows) {
  const g = groupSum(rows, block.x, block.series.map((s) => s.field));
  g.sort((a, b) => (a.key < b.key ? -1 : 1));
  return g;
}

export function tableRows(block: TableBlock, rows: Rows) {
  const out = [...rows];
  if (block.sort) {
    const { field, dir } = block.sort;
    out.sort((a, b) => {
      const x = a[field], y = b[field];
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return dir === "asc" ? c : -c;
    });
  }
  return block.limit ? out.slice(0, block.limit) : out;
}

/* ---------- formatting ---------- */
const compact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(a >= 1e10 ? 0 : 1) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 1 : 2) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(a >= 1e5 ? 0 : 1) + "K";
  return Math.round(n).toLocaleString("en-US");
};

export function fmt(v: unknown, f: Format = "text", opts: { full?: boolean } = {}): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = num(v);
  switch (f) {
    case "money":
      return opts.full ? "$" + Math.round(n).toLocaleString("en-US") : (n < 0 ? "−$" : "$") + compact(Math.abs(n));
    case "over":
      return "$" + compact(Math.abs(n)) + (n > 0 ? " over" : " under");
    case "pct":
      return Math.round(n * 100) + "%";
    case "dec2":
      return n.toFixed(2);
    case "hours":
      return Math.round(n).toLocaleString("en-US") + " hrs";
    case "num":
      return Math.round(n).toLocaleString("en-US");
    case "date": {
      const d = new Date(String(v) + (String(v).length === 10 ? "T12:00:00Z" : ""));
      return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    }
    case "status":
      return { good: "On track", watch: "Watch", risk: "At risk" }[String(v)] ?? String(v);
    default:
      return String(v);
  }
}

export function monthShort(label: string) {
  const [y, m] = label.split("-").map(Number);
  if (!y || !m) return label;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
}
