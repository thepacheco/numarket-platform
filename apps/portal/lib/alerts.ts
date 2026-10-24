import { fmt, visibleRows, type Datasets } from "@numarket/blocks";
import type { Scope } from "@numarket/db/repo/snapshots";
import type { Vocab } from "@numarket/db/demo/vocab";

/* Alerts: a person's own rules, checked against the latest update. Pure
   functions over the published data, so the page, the bell, and the daily
   email job all agree on what's firing. */

export type AlertKind = "job_over_budget" | "ar_over_60" | "rfi_waiting" | "cash_below" | "flag_opened" | "weekly_summary";
export type AlertRule = { id: string; kind: AlertKind; params: { amount?: number; days?: number }; email: boolean; active: boolean };
export type Firing = { key: string; title: string; body: string; link: string; tone: "risk" | "watch" | "info" };
export type Who = { scope: Scope; wholeCompany: boolean; flags: boolean };

type KindInfo = { kind: AlertKind; label: (v: Vocab) => string; describe: (r: AlertRule, v: Vocab) => string; param?: { key: "amount" | "days"; label: string; default: number; min: number; max: number; step: number }; allowed: (w: Who) => boolean };

const money = (x: number) => fmt(x, "money", { full: true });

export const ALERT_KINDS: KindInfo[] = [
  {
    kind: "weekly_summary",
    label: (v) => `Monday summary of every ${v.job}`,
    describe: (_r, v) => `Every Monday morning: each ${v.job}'s progress, cost against budget, and what's waiting, in one email.`,
    allowed: () => true,
  },
  {
    kind: "job_over_budget",
    label: (v) => `A ${v.job} goes over budget`,
    describe: (r, v) => `When a ${v.job} is more than ${money(r.params.amount ?? 0)} over budget for the work done.`,
    param: { key: "amount", label: "More than ($)", default: 25_000, min: 0, max: 10_000_000, step: 1000 },
    allowed: () => true,
  },
  {
    kind: "rfi_waiting",
    label: (v) => `An ${v.rfi} waits too long`,
    describe: (r, v) => `When an ${v.rfi} has been waiting more than ${r.params.days ?? 21} days for an answer.`,
    param: { key: "days", label: "More than (days)", default: 21, min: 1, max: 180, step: 1 },
    allowed: () => true,
  },
  {
    kind: "ar_over_60",
    label: (v) => `${v.Customers} owe too much over 60 days`,
    describe: (r) => `When invoices more than 60 days late add up to more than ${money(r.params.amount ?? 0)}.`,
    param: { key: "amount", label: "More than ($)", default: 100_000, min: 0, max: 100_000_000, step: 5000 },
    allowed: (w) => w.wholeCompany,
  },
  {
    kind: "cash_below",
    label: () => "Cash falls below a level",
    describe: (r) => `When cash on hand at month end is below ${money(r.params.amount ?? 0)}.`,
    param: { key: "amount", label: "Below ($)", default: 500_000, min: 0, max: 1_000_000_000, step: 10_000 },
    allowed: (w) => w.wholeCompany,
  },
  {
    kind: "flag_opened",
    label: () => "A data flag needs an answer",
    describe: () => "When the checks find something in your data that needs a person to answer.",
    allowed: (w) => w.flags,
  },
];
export const kindInfo = (k: string) => ALERT_KINDS.find((x) => x.kind === k);

/** What a rule finds in the current data. Each firing has a key, so it's sent once, not every day. */
export function evaluate(rule: AlertRule, ds: Datasets, who: Who, v: Vocab, asOfMonth: string, flags: { id: string; title: string; job: string | null }[] = []): Firing[] {
  const info = kindInfo(rule.kind);
  if (!rule.active || !info || !info.allowed(who)) return [];
  const amt = rule.params.amount ?? info.param?.default ?? 0;
  if (rule.kind === "job_over_budget") {
    return visibleRows(ds, "job_summary", who.scope)
      .map((j) => ({ j, over: (Number(j.actual) || 0) - (Number(j.earned) || 0) }))
      .filter((x) => x.over > amt)
      .sort((a, b) => b.over - a.over)
      .map(({ j, over }) => ({ key: `job_over_budget:${j.job}:${asOfMonth}`, tone: "risk", title: `${j.name} is ${money(over)} over budget`, body: `For the work done so far: spent ${money(Number(j.actual) || 0)} against ${money(Number(j.earned) || 0)} budgeted, ${fmt(j.pct_complete, "pct")} complete.`, link: `/dashboards/projects?job=${encodeURIComponent(String(j.job))}` }));
  }
  if (rule.kind === "rfi_waiting") {
    const days = rule.params.days ?? info.param!.default;
    return visibleRows(ds, "rfis", who.scope)
      .filter((r) => (Number(r.days_open) || 0) > days)
      .map((r) => ({ key: `rfi_waiting:${r.number}`, tone: "watch", title: `${r.number} has waited ${r.days_open} days`, body: `${String(r.subject)} on ${String(r.job_name)}. ${v.waitingOn} ${String(r.ball_in_court)}.`, link: `/dashboards/projects?page=rfis&job=${encodeURIComponent(String(r.job))}` }));
  }
  if (rule.kind === "ar_over_60") {
    const rows = visibleRows(ds, "ar_aging", null).map((r) => ({ c: String(r.customer), late: (Number(r.d61_90) || 0) + (Number(r.d90p) || 0) })).filter((r) => r.late > 0).sort((a, b) => b.late - a.late);
    const total = rows.reduce((t, r) => t + r.late, 0);
    return total > amt ? [{ key: `ar_over_60:${asOfMonth}`, tone: "risk", title: `${money(total)} is more than 60 days late`, body: `${rows[0].c} owes ${money(rows[0].late)} of it; ${rows.length} ${rows.length === 1 ? v.customer : v.customers} in all.`, link: "/dashboards/financials?page=receivables" }] : [];
  }
  if (rule.kind === "cash_below") {
    const cash = visibleRows(ds, "cash", null);
    const last = [...cash].reverse().find((r) => String(r.month) < asOfMonth) ?? cash[cash.length - 1];
    const bal = Number(last?.balance) || 0;
    return last && bal < amt ? [{ key: `cash_below:${last.month}`, tone: "risk", title: `Cash is ${money(bal)}, below ${money(amt)}`, body: `Cash on hand at the end of ${fmt(last.month, "month")}.`, link: "/dashboards/financials" }] : [];
  }
  if (rule.kind === "flag_opened") {
    return flags.filter((f) => !who.scope || !f.job || who.scope.values.includes(f.job)).map((f) => ({ key: `flag:${f.id}`, tone: "watch", title: "A data flag needs an answer", body: f.title, link: "/flags" }));
  }
  return [];
}

/** The Monday summary: every job this person can see, worst first. */
export function weeklySummary(ds: Datasets, who: Who, v: Vocab) {
  const jobs = visibleRows(ds, "job_summary", who.scope)
    .map((j) => ({ code: String(j.job), name: String(j.name), customer: String(j.customer), pct: Number(j.pct_complete) || 0, budget: Number(j.budget) || 0, actual: Number(j.actual) || 0, cpi: Number(j.cpi) || 0, over: (Number(j.actual) || 0) - (Number(j.earned) || 0), rfis: Number(j.open_rfis) || 0, status: String(j.status ?? "") }))
    .sort((a, b) => a.cpi - b.cpi);
  const over = jobs.filter((j) => j.over > 0).sort((a, b) => b.over - a.over);
  const headline = jobs.length === 0 ? `No ${v.jobs} to report.` : over.length ? `${over.length} of ${jobs.length} ${v.jobs} ${over.length === 1 ? "is" : "are"} over budget for the work done; ${over[0].name} is furthest over (${money(over[0].over)}).` : `All ${jobs.length} ${v.jobs} are on or under budget for the work done.`;
  return { jobs, headline };
}

/** The week a Monday summary belongs to, like "2026-W43", so it's sent once a week. */
export function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((+t - +y0) / 86_400_000 + 1) / 7)).padStart(2, "0")}`;
}
