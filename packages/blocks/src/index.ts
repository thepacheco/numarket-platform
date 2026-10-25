/* The building-block library (Spec §12.3). A dashboard is a set of pages; a
   page is rows of blocks; all of it is stored as data. Everything here is
   pure: it takes a snapshot's datasets plus the user's scope and the page
   filters (job, date range), and returns what to draw.

   Blocks: kpi (with prior-period comparison), trend (lines), columns,
   bar, stacked (aging), table (grouping, totals), statement (P&L). */

import { scopeRows, type Scope } from "@numarket/db/repo/snapshots";

export type Format = "money" | "num" | "pct" | "dec2" | "over" | "hours" | "status" | "text" | "date" | "month";

/* A value is a sum of a field over rows, optionally only rows that match. */
export type Term = string | { field: string; where?: Record<string, string | string[]> };
export type Expr = Term | { plus: Term[]; minus?: Term[] };
export type Agg =
  | { agg: "sum"; of: Expr }
  | { agg: "ratio"; num: Expr; den: Expr }
  | { agg: "avg"; of: string }
  | { agg: "count" }
  | { agg: "last"; of: string; by: string };

type Base = { title: string; dataset: string; definition?: string; span?: 1 | 2 | 3; note?: string };

/** A stable id for a block, so reports and Home can refer to it. */
export function blockId(b: { type: string; dataset: string; title: string }) {
  return `${b.type}:${b.dataset}:${b.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}
export type KpiBlock = Base & { type: "kpi"; value: Agg; format: Format; better?: "up" | "down"; compare?: boolean };
export type Series = { label: string; of: Expr };
export type TrendBlock = Base & { type: "trend"; x: string; series: Series[]; format: Format };
export type ColumnsBlock = Base & { type: "columns"; x: string; series: Series[]; format: Format };
export type BarBlock = Base & { type: "bar"; category: string; of: Expr; format: Format; limit?: number; keepOrder?: boolean };
export type StackedBlock = Base & { type: "stacked"; category: string; segments: { field: string; label: string }[]; format: Format; limit?: number };
export type Column = { field: string; label: string; format?: Format; definition?: string };
export type TableBlock = Base & { type: "table"; columns: Column[]; limit?: number; sort?: { field: string; dir: "asc" | "desc" }; groupBy?: { by: string[]; sum: string[] }; totals?: boolean };
export type StatementBlock = Base & {
  type: "statement";
  groups: string[];
  subtotals: { label: string; after: string; plus: string[]; minus?: string[] }[];
  percentOf: string;
};
export type Block = KpiBlock | TrendBlock | ColumnsBlock | BarBlock | StackedBlock | TableBlock | StatementBlock;

/* ---------- data reports (run on demand) ---------- */
export type Grouping = { key: string; label: string; columns: Column[]; groupBy?: { by: string[]; sum: string[] }; sort?: { field: string; dir: "asc" | "desc" } };
export type DataReportDef = { dataset: string; wholeCompany?: boolean; filters: { date?: boolean; job?: boolean }; groupings: Grouping[] };

export function runDataReport(def: DataReportDef, grouping: Grouping, rows: Rows) {
  const block: TableBlock = { type: "table", title: "", dataset: def.dataset, columns: grouping.columns, groupBy: grouping.groupBy, sort: grouping.sort, totals: true };
  const out = tableRows(block, rows);
  return { rows: out, totals: tableTotals(block, out), block };
}

export type Page = { slug: string; title: string; rows: Block[][] };
export type DashboardLayout = {
  /* hidden from people whose data scope is limited (company financials) */
  wholeCompany?: boolean;
  source?: string;
  filters: { date?: boolean; job?: boolean };
  pages: Page[];
};

export type Row = Record<string, unknown>;
export type Rows = Row[];
export type Datasets = Record<string, Rows>;

/* ---------- date ranges ---------- */

export type RangeKey = "mtd" | "lm" | "3m" | "6m" | "12m" | "ytd" | "custom";
export type MonthRange = { from: string; to: string };
export type RangeSel = { key: RangeKey; current: MonthRange; prior: MonthRange | null; label: string; compareLabel: string | null; compare?: "prior" | "year" };

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "mtd", label: "This month" },
  { key: "lm", label: "Last month" },
  { key: "3m", label: "Last 3 months" },
  { key: "6m", label: "Last 6 months" },
  { key: "12m", label: "Last 12 months" },
  { key: "ytd", label: "Year to date" },
  { key: "custom", label: "Custom" },
];

const ym = (y: number, m: number) => {
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const parseYm = (s: string) => {
  const [y, m] = s.split("-").map(Number);
  return { y, m: m - 1 };
};
export const addMonths = (s: string, n: number) => {
  const { y, m } = parseYm(s);
  return ym(y, m + n);
};
export const monthsBetween = (a: string, b: string) => {
  const x = parseYm(a), y = parseYm(b);
  return (y.y - x.y) * 12 + (y.m - x.m);
};
export function monthList(r: MonthRange) {
  const out: string[] = [];
  for (let m = r.from; m <= r.to && out.length < 120; m = addMonths(m, 1)) out.push(m);
  return out;
}
export const validYm = (s?: string | null) => !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

/** Turn the page's range choice into month ranges. "Last N months" means the
 *  N complete months before this one; the prior period is the same length,
 *  immediately before. Year to date compares with the same months last year. */
export function resolveRange(asOfMonth: string, key?: string | null, from?: string | null, to?: string | null, compare?: string | null): RangeSel {
  const k = (RANGE_OPTIONS.some((o) => o.key === key) ? key : "12m") as RangeKey;
  const last = addMonths(asOfMonth, -1);
  let current: MonthRange;
  if (k === "mtd") current = { from: asOfMonth, to: asOfMonth };
  else if (k === "lm") current = { from: last, to: last };
  /* year to date runs through the last complete month, so it compares fairly with last year */
  else if (k === "ytd") current = last >= `${asOfMonth.slice(0, 4)}-01` ? { from: `${asOfMonth.slice(0, 4)}-01`, to: last } : { from: asOfMonth, to: asOfMonth };
  else if (k === "custom" && validYm(from) && validYm(to) && from! <= to!) current = { from: from!, to: to! > asOfMonth ? asOfMonth : to! };
  else {
    const n = k === "3m" ? 3 : k === "6m" ? 6 : 12;
    current = { from: addMonths(last, -(n - 1)), to: last };
  }
  const len = monthsBetween(current.from, current.to) + 1;
  /* compare with the period just before, or with the same months last year (year to date always uses last year) */
  const lastYear = compare === "year" || k === "ytd";
  const prior = lastYear ? { from: addMonths(current.from, -12), to: addMonths(current.to, -12) } : k === "mtd" ? null : { from: addMonths(current.from, -len), to: addMonths(current.from, -1) };
  const label = `${monthLabel(current.from)}${current.to !== current.from ? ` – ${monthLabel(current.to)}` : ""}`;
  const compareLabel = prior ? (lastYear ? "vs same period last year" : `vs prior ${len === 1 ? "month" : `${len} months`}`) : null;
  return { key: k === "custom" && !(validYm(from) && validYm(to)) ? "12m" : k, current, prior, label, compareLabel, compare: lastYear ? "year" : "prior" };
}

/* ---------- rows a user may see ---------- */

export type Filters = { eq?: Record<string, string | undefined>; range?: MonthRange | null };

const rowMonth = (r: Row) => (typeof r.month === "string" ? r.month : typeof r.date === "string" ? r.date.slice(0, 7) : null);

/** A dataset's rows after the user's scope, the page filters, and the date
 *  range. Rows without a month or date ignore the range ("as of today"). */
export function visibleRows(datasets: Datasets, dataset: string, scope: Scope, filters: Filters = {}): Rows {
  let rows = scopeRows(datasets[dataset], scope);
  for (const [field, value] of Object.entries(filters.eq ?? {})) {
    if (!value) continue;
    rows = rows.filter((r) => !(field in r) || String(r[field]) === value);
  }
  const range = filters.range;
  if (range)
    rows = rows.filter((r) => {
      const m = rowMonth(r);
      return m === null || (m >= range.from && m <= range.to);
    });
  return rows;
}

export function isDated(datasets: Datasets, dataset: string) {
  const r = datasets[dataset]?.[0];
  return !!r && rowMonth(r) !== null;
}

/* ---------- evaluation ---------- */

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const matches = (r: Row, where?: Record<string, string | string[]>) =>
  !where || Object.entries(where).every(([k, v]) => (Array.isArray(v) ? v.includes(String(r[k])) : String(r[k]) === v));
const termSum = (rows: Rows, t: Term) => {
  const { field, where } = typeof t === "string" ? { field: t, where: undefined } : t;
  let s = 0;
  for (const r of rows) if (matches(r, where)) s += num(r[field]);
  return s;
};
export function evalExpr(rows: Rows, e: Expr): number {
  if (typeof e === "string" || "field" in e) return termSum(rows, e);
  return e.plus.reduce((t, x) => t + termSum(rows, x), 0) - (e.minus ?? []).reduce((t, x) => t + termSum(rows, x), 0);
}

export function computeAgg(rows: Rows, a: Agg): number | null {
  if (a.agg === "count") return rows.length;
  if (!rows.length) return null;
  if (a.agg === "sum") return evalExpr(rows, a.of);
  if (a.agg === "avg") return rows.reduce((t, r) => t + num(r[a.of]), 0) / rows.length;
  if (a.agg === "last") {
    const latest = rows.reduce((m, r) => (String(r[a.by]) > m ? String(r[a.by]) : m), "");
    return rows.filter((r) => String(r[a.by]) === latest).reduce((t, r) => t + num(r[a.of]), 0);
  }
  const den = evalExpr(rows, a.den);
  return den === 0 ? null : evalExpr(rows, a.num) / den;
}

export type KpiData = { value: number | null; prior: number | null; change: number | null; tone: "good" | "bad" | null; status: string | null };

export function kpiData(block: KpiBlock, rows: Rows, priorRows?: Rows | null): KpiData {
  const value = computeAgg(rows, block.value);
  const prior = block.compare && priorRows ? computeAgg(priorRows, block.value) : null;
  let change: number | null = null;
  if (value !== null && prior !== null && prior !== 0) change = block.format === "pct" ? value - prior : (value - prior) / Math.abs(prior);
  let tone: KpiData["tone"] = null;
  if (change !== null && block.better) tone = change > 0 === (block.better === "up") ? "good" : "bad";
  let status: string | null = null;
  if (value !== null && block.format === "dec2" && block.better === "up") status = value >= 1 ? "On or under budget" : "Over budget";
  if (value !== null && block.format === "over") status = value <= 0 ? "On or under budget" : "Over budget";
  if (status) tone = status.startsWith("On") ? "good" : "bad";
  return { value, prior, change, tone, status };
}

/** Values for each x (month) and series. Months with no rows show as zero. */
export function seriesData(block: TrendBlock | ColumnsBlock, rows: Rows, range?: MonthRange | null) {
  const groups = new Map<string, Rows>();
  for (const r of rows) {
    const k = block.x === "month" ? (rowMonth(r) ?? String(r.month)) : String(r[block.x]);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  const keys = block.x === "month" && range ? monthList(range) : [...groups.keys()].sort();
  return keys.map((k) => ({ key: k, values: block.series.map((s) => evalExpr(groups.get(k) ?? [], s.of)) }));
}

export function barData(block: BarBlock, rows: Rows) {
  const groups = new Map<string, Rows>();
  for (const r of rows) {
    const k = String(r[block.category]);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  const out = [...groups.entries()].map(([label, g]) => ({ label, value: evalExpr(g, block.of) }));
  if (!block.keepOrder) out.sort((a, b) => b.value - a.value);
  return block.limit ? out.slice(0, block.limit) : out;
}

export function stackedData(block: StackedBlock, rows: Rows) {
  const m = new Map<string, number[]>();
  for (const r of rows) {
    const k = String(r[block.category]);
    const cur = m.get(k) ?? block.segments.map(() => 0);
    block.segments.forEach((s, i) => (cur[i] += num(r[s.field])));
    m.set(k, cur);
  }
  const out = [...m.entries()].map(([label, values]) => ({ label, values, total: values.reduce((a, b) => a + b, 0) })).filter((x) => x.total > 0);
  out.sort((a, b) => b.total - a.total);
  return block.limit ? out.slice(0, block.limit) : out;
}

export function tableRows(block: TableBlock, rows: Rows) {
  let out: Rows;
  if (block.groupBy) {
    const { by, sum } = block.groupBy;
    const m = new Map<string, Row>();
    for (const r of rows) {
      const key = by.map((b) => String(r[b])).join("|");
      const cur: Row = m.get(key) ?? Object.fromEntries([...by.map((b) => [b, r[b]]), ...sum.map((s) => [s, 0])]);
      for (const s of sum) cur[s] = num(cur[s]) + num(r[s]);
      m.set(key, cur);
    }
    out = [...m.values()];
  } else out = [...rows];
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

const SUMMABLE: Format[] = ["money", "num", "hours"];
export function tableTotals(block: TableBlock, rows: Rows): Row | null {
  if (!block.totals || !rows.length) return null;
  const t: Row = {};
  for (const c of block.columns) if (c.format && SUMMABLE.includes(c.format)) t[c.field] = rows.reduce((s, r) => s + num(r[c.field]), 0);
  return t;
}

export type StatementLine = { label: string; current: number; prior: number | null; kind: "group" | "line" | "subtotal" | "total"; share: number | null };

/** A profit-and-loss statement over a period, with the prior period beside it. */
export function statementData(block: StatementBlock, rows: Rows, priorRows: Rows | null): StatementLine[] {
  const sumBy = (rs: Rows, group: string, account?: string) =>
    rs.filter((r) => r.section === group && (account === undefined || r.account === account)).reduce((t, r) => t + num(r.amount), 0);
  const base = sumBy(rows, block.percentOf) || 0;
  const share = (v: number) => (base ? v / base : null);
  const out: StatementLine[] = [];
  for (const g of block.groups) {
    out.push({ label: g, current: 0, prior: null, kind: "group", share: null });
    const accounts = [...new Map(rows.filter((r) => r.section === g).sort((a, b) => num(a.sort) - num(b.sort)).map((r) => [String(r.account), true])).keys()];
    for (const a of accounts) {
      const c = sumBy(rows, g, a);
      out.push({ label: a, current: c, prior: priorRows ? sumBy(priorRows, g, a) : null, kind: "line", share: share(c) });
    }
    const gt = sumBy(rows, g);
    out.push({ label: `Total ${g.toLowerCase()}`, current: gt, prior: priorRows ? sumBy(priorRows, g) : null, kind: "subtotal", share: share(gt) });
    for (const st of block.subtotals.filter((s) => s.after === g)) {
      const calc = (rs: Rows) => st.plus.reduce((t, x) => t + sumBy(rs, x), 0) - (st.minus ?? []).reduce((t, x) => t + sumBy(rs, x), 0);
      const c = calc(rows);
      out.push({ label: st.label, current: c, prior: priorRows ? calc(priorRows) : null, kind: "total", share: share(c) });
    }
  }
  return out;
}

/* ---------- formatting ---------- */

const compact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(a >= 1e10 ? 0 : 1) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 1 : 2) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(a >= 1e5 ? 0 : 1) + "K";
  return Math.round(n).toLocaleString("en-US");
};

export function monthLabel(s: string, opts: { short?: boolean } = {}) {
  if (!validYm(s)) return s;
  const { y, m } = parseYm(s);
  return new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-US", { month: "short", year: opts.short ? undefined : "numeric", timeZone: "UTC" });
}

export function fmt(v: unknown, f: Format = "text", opts: { full?: boolean } = {}): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = num(v);
  switch (f) {
    case "money":
      return opts.full ? (n < 0 ? "−$" : "$") + Math.round(Math.abs(n)).toLocaleString("en-US") : (n < 0 ? "−$" : "$") + compact(Math.abs(n));
    case "over":
      return "$" + compact(Math.abs(n)) + (n > 0 ? " over" : " under");
    case "pct":
      return (Math.round(n * 1000) / 10).toFixed(1) + "%";
    case "dec2":
      return n.toFixed(2);
    case "hours":
      return Math.round(n).toLocaleString("en-US") + " hrs";
    case "num":
      return Math.round(n).toLocaleString("en-US");
    case "month":
      return monthLabel(String(v));
    case "date": {
      const d = new Date(String(v) + (String(v).length === 10 ? "T12:00:00Z" : ""));
      return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    }
    case "status":
      return ({ good: "On track", watch: "Watch", risk: "At risk" } as Record<string, string>)[String(v)] ?? String(v);
    default:
      return String(v);
  }
}

export function fmtChange(change: number | null, f: Format) {
  if (change === null) return null;
  if (f === "pct") return `${change >= 0 ? "▲" : "▼"} ${Math.abs(change * 100).toFixed(1)} pts`;
  return `${change >= 0 ? "▲" : "▼"} ${Math.abs(change * 100).toFixed(1)}%`;
}
