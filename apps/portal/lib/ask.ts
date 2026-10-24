import { fmt, monthLabel, resolveRange, visibleRows, type Datasets } from "@numarket/blocks";
import type { Scope } from "@numarket/db/repo/snapshots";
import { CONSTRUCTION, type Vocab } from "@numarket/db/demo/vocab";

/* Ask Your Data, as the demo runs it. A question is matched to one of the
   question types below and answered from the same published data the
   dashboards use, within the person's access. In a client workspace the same
   page sends the question to the AI in the client's private database, which
   answers from the governed tables and the definitions. */

export type Answer = {
  ok: boolean;
  title: string;
  text: string;
  table?: { columns: string[]; numeric: boolean[]; rows: string[][] };
  defs: string[];
  basis: string;
};

export type AskState = { items: { question: string; answer: Answer; updated: string }[]; error?: string };

/* Questions to start from, in the workspace's own words. A dashboard
   suggests the questions that fit it. */
export function suggestedFor(v: Vocab, scoped: boolean, focus?: "financials" | "projects"): string[] {
  const svc = v.industry === "services";
  const projects = [
    `Which ${v.jobs} are over budget?`,
    svc ? "How is Customer Portal Rebuild doing?" : "How is Route 9 Bridge doing?",
    `What were ${v.changeOrders} last quarter, by cause?`,
    svc ? "What are we waiting on from clients?" : "Which RFIs have been open the longest?",
    `${v.Hours} by ${v.job} last month`,
  ];
  const company = ["Who owes us money over 60 days?", "How much cash do we have?", "What was net income last month?", `Who are our biggest ${v.customers} this year?`];
  if (scoped) return projects;
  if (focus === "projects") return projects;
  if (focus === "financials") return company;
  return [projects[0], company[0], projects[1], projects[2], projects[3], company[1], company[2], projects[4]];
}
/* kept for older callers */
export const SUGGESTED = suggestedFor(CONSTRUCTION, false);

type Ctx = { datasets: Datasets; scope: Scope; asOf: string };
type Row = Record<string, unknown>;

const n = (v: unknown) => Number(v) || 0;
const money = (v: number) => fmt(v, "money");
const sum = (rows: Row[], f: string) => rows.reduce((t, r) => t + n(r[f]), 0);
const has = (q: string, ...words: (string | RegExp)[]) => words.some((w) => (typeof w === "string" ? q.includes(w) : w.test(q)));
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

const COMPANY_ONLY = (scopeNames: string, v: Vocab) =>
  ({ ok: false, title: "That's a company-wide number", text: `Your access covers ${scopeNames} only, so company-wide totals like this aren't shown to you. Ask about your ${v.jobs} instead.`, defs: [], basis: "" }) satisfies Answer;

function findJob(q: string, jobs: Row[]) {
  for (const j of jobs) {
    const name = String(j.name).toLowerCase();
    const code = String(j.job).toLowerCase();
    if (q.includes(name) || new RegExp(`\\b(job|project|#)\\s*${code}\\b`).test(q) || new RegExp(`\\b${code}\\b`).test(q) && /^\d+$/.test(code)) return j;
    const words = name.split(/\s+/).filter((w) => w.length > 3);
    if (words.length >= 2 && words.every((w) => q.includes(w))) return j;
  }
  return null;
}

function periodFrom(q: string, asOf: string) {
  if (has(q, "this year", "ytd", "year to date")) return resolveRange(asOf, "ytd");
  if (has(q, "last quarter", "quarter", "3 months", "three months")) return resolveRange(asOf, "3m");
  if (has(q, "6 months", "six months", "half")) return resolveRange(asOf, "6m");
  if (has(q, "12 months", "twelve months", "last year", "past year")) return resolveRange(asOf, "12m");
  if (has(q, "this month", "month to date", "mtd")) return resolveRange(asOf, "mtd");
  return resolveRange(asOf, "lm");
}

export function answer(question: string, c: Ctx, scopeNames: string, v: Vocab = CONSTRUCTION): Answer {
  const q = question.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
  const jobs = visibleRows(c.datasets, "job_summary", c.scope);
  const job = findJob(q, jobs);
  const jobEq = job ? { job: String(job.job) } : {};
  const scoped = !!c.scope;
  const period = periodFrom(q, c.asOf);

  /* change orders */
  if (has(q, "change order", /\bcos?\b/, "scope change", "scope creep")) {
    const rows = visibleRows(c.datasets, "change_orders", c.scope, { eq: jobEq, range: period.current });
    const by = new Map<string, { count: number; amount: number }>();
    const key = job || has(q, "cause", "why", "reason") ? "cause" : "job_name";
    for (const r of rows) {
      const k = String(r[key]);
      const x = by.get(k) ?? { count: 0, amount: 0 };
      x.count += n(r.count);
      x.amount += n(r.amount);
      by.set(k, x);
    }
    const sorted = [...by.entries()].sort((a, b) => b[1].amount - a[1].amount);
    const total = sum(rows, "amount");
    return {
      ok: true,
      title: `${v.ChangeOrders}${job ? ` on ${job.name}` : ""}, ${period.label}`,
      text: rows.length ? `${sum(rows, "count")} ${v.changeOrders} for ${money(total)}. The largest share is ${sorted[0][0]} at ${money(sorted[0][1].amount)} (${Math.round((sorted[0][1].amount / total) * 100)}%).` : `No ${v.changeOrders} in that period.`,
      table: { columns: [key === "cause" ? "Cause" : v.Job, "Count", "Amount"], numeric: [false, true, true], rows: sorted.map(([k, x]) => [k, String(x.count), money(x.amount)]) },
      defs: [v.ChangeOrders],
      basis: `${v.ChangeOrders}, ${period.label}`,
    };
  }

  /* RFIs */
  if (has(q, "rfi", "request for information", "requests for information", "client request", "waiting on", "waiting for")) {
    const rows = visibleRows(c.datasets, "rfis", c.scope, { eq: jobEq }).slice(0, 8);
    const waiting = new Map<string, number>();
    for (const r of rows) waiting.set(String(r.ball_in_court), (waiting.get(String(r.ball_in_court)) ?? 0) + 1);
    const top = [...waiting.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      ok: true,
      title: `Oldest open ${v.rfis}${job ? ` on ${job.name}` : ""}`,
      text: rows.length ? `${rows[0].number} on ${rows[0].job_name} has been open ${rows[0].days_open} days, waiting on ${rows[0].ball_in_court}. Of the ${rows.length} oldest, ${top[1]} are waiting on ${top[0]}.` : `No open ${v.rfis}.`,
      table: { columns: [v.rfiCol, v.Job, "Subject", "Waiting on", "Days open"], numeric: [false, false, false, false, true], rows: rows.map((r) => [String(r.number), String(r.job_name), String(r.subject), String(r.ball_in_court), String(r.days_open)]) },
      defs: [v.rfiShort],
      basis: `${v.rfiShort}, as of the last update`,
    };
  }

  /* crew hours */
  if (has(q, "crew", "hours", "labor", "labour", "manpower", "billable", "timesheet", "time entries")) {
    const rows = visibleRows(c.datasets, "crew_hours_monthly", c.scope, { eq: jobEq, range: period.current });
    const by = new Map<string, { hours: number; cost: number }>();
    for (const r of rows) {
      const x = by.get(String(r.job_name)) ?? { hours: 0, cost: 0 };
      x.hours += n(r.hours);
      x.cost += n(r.labor_cost);
      by.set(String(r.job_name), x);
    }
    const sorted = [...by.entries()].sort((a, b) => b[1].hours - a[1].hours);
    return {
      ok: true,
      title: `${v.Hours}${job ? ` on ${job.name}` : ` by ${v.job}`}, ${period.label}`,
      text: rows.length ? `${fmt(sum(rows, "hours"), "hours")} across ${sorted.length} ${sorted.length === 1 ? v.job : v.jobs}, about ${money(sum(rows, "labor_cost"))} in ${v.laborCost.toLowerCase()}.` : `No ${v.hours} reported in that period.`,
      table: { columns: [v.Job, v.Hours, v.laborCost], numeric: [false, true, true], rows: sorted.map(([k, x]) => [k, fmt(x.hours, "hours"), money(x.cost)]) },
      defs: [v.Hours, v.laborCost],
      basis: `${v.fieldReportsLong}, ${period.label}`,
    };
  }

  /* receivables */
  if (has(q, "owe us", "owes us", "owed", "receivable", /\bar\b/, "collect", "unpaid invoice", "overdue", "past due", "slow pay")) {
    if (scoped) return COMPANY_ONLY(scopeNames, v);
    const rows = visibleRows(c.datasets, "ar_aging", null);
    const over60 = (r: Row) => n(r.d61_90) + n(r.d90p);
    const total = sum(rows, "total");
    const old = rows.filter((r) => over60(r) > 0).sort((a, b) => over60(b) - over60(a));
    const wantOld = has(q, "60", "90", "old", "overdue", "past due", "late", "slow");
    const shown = wantOld ? old : [...rows].sort((a, b) => n(b.total) - n(a.total)).slice(0, 8);
    return {
      ok: true,
      title: wantOld ? `${v.Customers} who owe you over 60 days` : "Who owes you",
      text: `${v.Customers} owe ${money(total)} in all. ${old.length ? `${money(sum(old, "d61_90") + sum(old, "d90p"))} is over 60 days old, most of it from ${old[0].customer} (${money(over60(old[0]))}).` : "Nothing is over 60 days old."}`,
      table: { columns: [v.Customer, "Current", "1–60 days", "Over 60 days", "Total"], numeric: [false, true, true, true, true], rows: shown.map((r) => [String(r.customer), money(n(r.current)), money(n(r.d1_30) + n(r.d31_60)), money(over60(r)), money(n(r.total))]) },
      defs: [`${v.Customers} owe you`, "Owed for over 60 days"],
      basis: "Receivables aging, as of the last update",
    };
  }

  /* payables */
  if (has(q, "we owe", "payable", /\bap\b/, "bills", "vendors", "suppliers", "subs ")) {
    if (scoped) return COMPANY_ONLY(scopeNames, v);
    const rows = [...visibleRows(c.datasets, "ap_aging", null)].sort((a, b) => n(b.total) - n(a.total));
    return {
      ok: true,
      title: "What you owe vendors",
      text: `You owe vendors ${money(sum(rows, "total"))}. ${money(sum(rows, "due_7d"))} is due in the next 7 days.`,
      table: { columns: ["Vendor", "Total owed", "Due in 7 days"], numeric: [false, true, true], rows: rows.map((r) => [String(r.vendor), money(n(r.total)), money(n(r.due_7d))]) },
      defs: ["You owe vendors", "Due in the next 7 days"],
      basis: "Payables aging, as of the last update",
    };
  }

  /* cash */
  if (has(q, "cash", "bank", "in the bank")) {
    if (scoped) return COMPANY_ONLY(scopeNames, v);
    const rows = visibleRows(c.datasets, "cash", null).filter((r) => String(r.month) < c.asOf);
    const last = rows[rows.length - 1];
    const prev = rows[rows.length - 2];
    const yearAgo = rows[rows.length - 13];
    const recent = rows.slice(-6);
    return {
      ok: true,
      title: "Cash on hand",
      text: last ? `${money(n(last.balance))} at the end of ${monthLabel(String(last.month))}, ${n(last.balance) >= n(prev?.balance) ? "up" : "down"} ${money(Math.abs(n(last.balance) - n(prev?.balance)))} from the month before${yearAgo ? ` and ${n(last.balance) >= n(yearAgo.balance) ? "up" : "down"} ${money(Math.abs(n(last.balance) - n(yearAgo.balance)))} from a year earlier` : ""}.` : "No cash balances yet.",
      table: { columns: ["Month end", "Balance"], numeric: [false, true], rows: recent.reverse().map((r) => [monthLabel(String(r.month)), money(n(r.balance))]) },
      defs: ["Cash on hand"],
      basis: "Bank balances at month end",
    };
  }

  /* profit */
  if (has(q, "net income", "profit", "margin", "p&l", "p and l", "making money", "earnings", "expenses", "opex")) {
    if (scoped) return COMPANY_ONLY(scopeNames, v);
    const rows = visibleRows(c.datasets, "pnl", null, { range: period.current });
    const prior = period.prior ? visibleRows(c.datasets, "pnl", null, { range: period.prior }) : [];
    const sec = (rs: Row[], s: string) => sum(rs.filter((r) => r.section === s), "amount");
    const line = (rs: Row[]) => {
      const rev = sec(rs, "Revenue");
      const cogs = sec(rs, "Cost of goods sold");
      const opex = sec(rs, "Operating expenses");
      return { rev, gross: rev - cogs, opex, net: rev - cogs - opex };
    };
    const now = line(rows);
    const was = line(prior);
    const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : "—");
    return {
      ok: true,
      title: `Profit, ${period.label}`,
      text: `Net income was ${money(now.net)} on ${money(now.rev)} of revenue (${pct(now.net, now.rev)}). Gross margin was ${pct(now.gross, now.rev)}${period.prior ? `, against ${pct(was.gross, was.rev)} ${period.compareLabel?.replace(/^vs /, "in the ")}` : ""}.`,
      table: {
        columns: ["", period.label, ...(period.prior ? [(period.compareLabel ?? "").replace(/^vs ./, (m) => m.slice(3).toUpperCase())] : [])],
        numeric: [false, true, true],
        rows: [
          ["Revenue", money(now.rev), ...(period.prior ? [money(was.rev)] : [])],
          ["Gross profit", money(now.gross), ...(period.prior ? [money(was.gross)] : [])],
          ["Operating expenses", money(now.opex), ...(period.prior ? [money(was.opex)] : [])],
          ["Net income", money(now.net), ...(period.prior ? [money(was.net)] : [])],
        ],
      },
      defs: ["Net income", "Gross margin", "Operating expenses"],
      basis: `Profit and loss, ${period.label}`,
    };
  }

  /* revenue */
  if (has(q, "revenue", "billed", "billing", "sales", "invoiced", "income", "fees", "top customer", "biggest customer", "top client", "biggest client")) {
    if (scoped) return COMPANY_ONLY(scopeNames, v);
    const rows = visibleRows(c.datasets, "revenue_by_customer", null, { range: period.current });
    const prior = period.prior ? visibleRows(c.datasets, "revenue_by_customer", null, { range: period.prior }) : [];
    const by = new Map<string, number>();
    for (const r of rows) by.set(String(r.customer), (by.get(String(r.customer)) ?? 0) + n(r.amount));
    const sorted = [...by.entries()].sort((a, b) => b[1] - a[1]);
    const total = sum(rows, "amount");
    const before = sum(prior, "amount");
    return {
      ok: true,
      title: `Revenue, ${period.label}`,
      text: `${money(total)}${before ? `, ${total >= before ? "up" : "down"} ${Math.abs(Math.round(((total - before) / before) * 100))}% ${period.compareLabel}` : ""}. The largest ${v.customer} was ${sorted[0]?.[0]} at ${money(sorted[0]?.[1] ?? 0)}.`,
      table: { columns: [v.Customer, "Revenue", "Share"], numeric: [false, true, true], rows: sorted.slice(0, 8).map(([k, x]) => [k, money(x), `${Math.round((x / total) * 100)}%`]) },
      defs: ["Revenue"],
      basis: `Revenue by ${v.customer}, ${period.label}`,
    };
  }

  /* over budget / at risk */
  if (has(q, "over budget", "budget", "at risk", "behind", "overrun", "losing money", "cpi", "cost performance", "trouble", "worst")) {
    const over = jobs.filter((j) => n(j.over) > 0).sort((a, b) => n(b.over) - n(a.over));
    const rows = job ? [job] : over.length ? over : jobs;
    return {
      ok: true,
      title: job ? `${job.name}: cost vs. budget` : `${v.Jobs} costing more than budgeted`,
      text: job
        ? `${job.name} has spent ${money(n(job.actual))} for work budgeted at ${money(n(job.earned))}, so it is ${fmt(n(job.over), "over")} (cost performance ${fmt(job.cpi, "dec2")}).`
        : over.length
          ? `${over.length} of ${jobs.length} ${v.jobs} are costing more than the budget for the work done: ${list(over.slice(0, 3).map((j) => `${j.name} (${money(n(j.over))} over)`))}.`
          : `Every ${v.job} is at or under the budget for the work done.`,
      table: { columns: [v.Job, "Budget for work done", "Spent", "Over / under", "Cost performance"], numeric: [false, true, true, true, true], rows: rows.map((j) => [String(j.name), money(n(j.earned)), money(n(j.actual)), fmt(n(j.over), "over"), fmt(j.cpi, "dec2")]) },
      defs: ["Cost vs. budget for work done", "Cost performance"],
      basis: `${v.Job} costs to date`,
    };
  }

  /* one job */
  if (job || has(q, "how are the jobs", "jobs doing", "projects doing", "status of", "how's", "how is")) {
    const rows = job ? [job] : jobs;
    const j = rows[0];
    return {
      ok: true,
      title: job ? `${job.name} (${v.job} ${job.job})` : `Every ${v.job} at a glance`,
      text: job
        ? `${Math.round(n(j.pct_complete) * 100)}% complete for ${String(j.customer)}. Spent ${money(n(j.actual))} of a ${money(n(j.budget))} budget, ${fmt(n(j.over), "over")} for the work done. ${j.open_rfis} open ${v.rfis} and ${money(n(j.change_orders))} in ${v.changeOrders}.`
        : `${jobs.length} ${v.jobs}. ${jobs.filter((x) => x.status === "risk").length} at risk, ${jobs.filter((x) => x.status === "watch").length} to watch.`,
      table: { columns: [v.Job, "Complete", "Budget", "Spent", "Over / under", v.rfiShort], numeric: [false, true, true, true, true, true], rows: rows.map((x) => [String(x.name), `${Math.round(n(x.pct_complete) * 100)}%`, money(n(x.budget)), money(n(x.actual)), fmt(n(x.over), "over"), String(x.open_rfis)]) },
      defs: ["Percent complete", "Spent to date", "Cost vs. budget for work done", v.rfiShort],
      basis: `${v.Job} costs to date`,
    };
  }

  return {
    ok: false,
    title: "I can't answer that one in the demo",
    text: `The demo answers common questions about ${v.jobs}, budgets, ${v.changeOrders}, ${v.rfis}, ${v.hours}, cash, revenue, profit, and who owes whom. Try one of the suggested questions.`,
    defs: [],
    basis: "",
  };
}
