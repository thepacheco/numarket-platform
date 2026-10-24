import { addMonths, monthLabel, type Block, type RangeSel } from "@numarket/blocks";
import type { Vocab } from "@numarket/db/demo/vocab";

/* The quarterly business review pack: the same building blocks as the
   dashboards, set to one quarter and compared with the quarter before. The
   analyst brings it to the QBR meeting; leaders print it for the board. */

export type Quarter = { key: string; label: string; from: string; to: string };

const qOf = (ym: string) => Math.floor((Number(ym.slice(5, 7)) - 1) / 3) + 1;
export function quarterOf(ym: string): Quarter {
  const y = ym.slice(0, 4);
  const q = qOf(ym);
  const from = `${y}-${String((q - 1) * 3 + 1).padStart(2, "0")}`;
  return { key: `${y}-Q${q}`, label: `Q${q} ${y}`, from, to: addMonths(from, 2) };
}

/** The last four complete quarters before the month of the latest update, newest first. */
export function completeQuarters(asOfMonth: string, n = 4): Quarter[] {
  const out: Quarter[] = [];
  let q = quarterOf(addMonths(quarterOf(asOfMonth).from, -1));
  for (let i = 0; i < n; i++) {
    out.push(q);
    q = quarterOf(addMonths(q.from, -1));
  }
  return out;
}

export function quarterRange(q: Quarter): RangeSel {
  const prior = quarterOf(addMonths(q.from, -1));
  return { key: "custom", current: { from: q.from, to: q.to }, prior: { from: prior.from, to: prior.to }, label: `${q.label} (${monthLabel(q.from, { short: true })}–${monthLabel(q.to, { short: true })})`, compareLabel: `vs ${prior.label}` };
}

/** Twelve months ending with the quarter, for the trend charts. */
export function yearTo(q: Quarter): RangeSel {
  return { key: "custom", current: { from: addMonths(q.to, -11), to: q.to }, prior: null, label: `12 months to ${monthLabel(q.to)}`, compareLabel: null };
}

const rev = { field: "amount", where: { section: "Revenue" } };
const cogs = { field: "amount", where: { section: "Cost of goods sold" } };
const opex = { field: "amount", where: { section: "Operating expenses" } };

export function qbrBlocks(v: Vocab) {
  const kpis: Block[] = [
    { type: "kpi", title: "Revenue", dataset: "pnl", value: { agg: "sum", of: rev }, format: "money", compare: true, better: "up", definition: "revenue" },
    { type: "kpi", title: "Gross margin", dataset: "pnl", value: { agg: "ratio", num: { plus: [rev], minus: [cogs] }, den: rev }, format: "pct", compare: true, better: "up", definition: "gross_margin" },
    { type: "kpi", title: "Net income", dataset: "pnl", value: { agg: "sum", of: { plus: [rev], minus: [cogs, opex] } }, format: "money", compare: true, better: "up", definition: "net_income" },
    { type: "kpi", title: "Cash at quarter end", dataset: "cash", value: { agg: "last", of: "balance", by: "month" }, format: "money", compare: true, better: "up", definition: "cash" },
  ];
  const trend: Block = { type: "trend", title: "Revenue and net income by month", dataset: "pnl", x: "month", series: [{ label: "Revenue", of: rev }, { label: "Net income", of: { plus: [rev], minus: [cogs, opex] } }], format: "money", definition: "revenue", span: 2 };
  const hours: Block = { type: "columns", title: `${v.Hours} by month`, dataset: "crew_hours_monthly", x: "month", series: [{ label: v.Hours, of: "hours" }], format: "hours", definition: "crew_hours" };
  const jobs: Block = {
    type: "table",
    title: `${v.Jobs}: where each one stands`,
    dataset: "job_summary",
    sort: { field: "cpi", dir: "asc" },
    totals: true,
    columns: [
      { field: "name", label: v.Job },
      { field: "customer", label: v.Customer },
      { field: "pct_complete", label: "Complete", format: "pct", definition: "pct_complete" },
      { field: "budget", label: "Budget", format: "money", definition: "budget" },
      { field: "actual", label: "Spent", format: "money", definition: "actual" },
      { field: "cpi", label: "Cost perf.", format: "dec2", definition: "cpi" },
      { field: "status", label: "Status", format: "status" },
    ],
    span: 3,
  };
  const causes: Block = { type: "bar", title: `${v.ChangeOrders} by cause this quarter`, dataset: "change_orders", category: "cause", of: "amount", format: "money", definition: "change_orders" };
  const ar: Block = { type: "kpi", title: "Owed for over 60 days", dataset: "ar_aging", value: { agg: "sum", of: { plus: ["d61_90", "d90p"] } }, format: "money", definition: "ar_over_60" };
  return { kpis, trend, hours, jobs, causes, ar };
}

/** A review belongs to the quarter its month falls in. */
export const inQuarter = (period: string, q: Quarter) => period >= q.from && period <= q.to;
