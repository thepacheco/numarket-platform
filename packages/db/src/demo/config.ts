import { structure } from "./structure";
import { CONSTRUCTION } from "./vocab";

/* Configuration for a sample construction workspace: dashboards, input
   screens, and reports are assembled from building blocks as data, not code
   ("configure, don't code", Spec §0). Business definitions, flags, sources,
   and data checks are sample content. All of it is fictional. */

export const CO_CAUSES = ["Design errors", "Owner changes", "Unforeseen conditions", "Weather", "Scope additions"];

export const SCREENS = [
  {
    slug: "daily-field-report",
    title: "Daily field report",
    description: "Replaces the paper daily log. Superintendents fill it in from the job site.",
    fields: [
      { key: "job", label: "Job", type: "select", options: "jobs", required: true },
      { key: "date", label: "Date", type: "date", required: true, minDaysAgo: 14 },
      { key: "crew_hours", label: "Crew hours", type: "number", required: true, min: 0.5, max: 400, step: 0.5, help: "Total hours for the whole crew today." },
      { key: "pct_complete", label: "Percent complete", type: "number", min: 0, max: 100, step: 1, help: "Optional. Your best estimate for the whole job." },
      { key: "note", label: "Note", type: "text", maxLength: 280 },
    ],
  },
  {
    slug: "change-order-log",
    title: "Change order log",
    description: "Log a change order the day it's approved, instead of a spreadsheet emailed at month end.",
    fields: [
      { key: "job", label: "Job", type: "select", options: "jobs", required: true },
      { key: "cause", label: "Cause", type: "select", options: CO_CAUSES, required: true },
      { key: "amount", label: "Amount ($)", type: "number", required: true, min: 100, max: 2_000_000, step: 1 },
      { key: "description", label: "What changed", type: "text", required: true, maxLength: 200 },
    ],
  },
];

const S = structure(CONSTRUCTION, {
  causes: CO_CAUSES,
  projectSource: "Procore, QuickBooks Online, and your Portal forms",
  ownerReport: { name: "Owner report for one job", about: "Sent to the project owner, in their name: progress, the job's numbers, cost against budget, change orders, and what's coming up." },
});
export const DASHBOARDS = S.dashboards;
export const REPORT_TEMPLATES = S.reportTemplates;
export const DATA_REPORTS = S.dataReports;
const template = (key: string) => REPORT_TEMPLATES.find((t) => t.key === key)!.layout;

export const REPORTS = [
  {
    slug: "weekly-status",
    title: "Weekly status report",
    description: "The Monday report for the leadership team. Numbers fill in from your data; your team writes the commentary.",
    layout: { ...template("weekly"), prepared_for: null, job: null },
    draft: {
      summary: "Terminal Expansion passed its steel inspection on the east concourse. Data Center Shell is ahead of budget for the work done so far, and Substation Upgrade is on track to finish in November.",
      money: "Billing held steady and margins are in line with last month. Cash is healthy; the one slow payer is Halden County DOT.",
      risks: "Route 9 Bridge is running over budget for the work done, driven by design-error change orders. Twenty-one RFIs are open there, five of them for more than three weeks. Halden County DOT has $212K outstanding past 60 days.",
      next: "Resolve the five oldest RFIs on Route 9 Bridge. Review design-error change orders with the engineer of record on Thursday. Follow up on the Halden County DOT payment.",
    },
  },
  {
    slug: "owner-report-108",
    title: "Owner report: Terminal Expansion",
    description: "Sent to the project owner every two weeks, in their name.",
    layout: { ...template("owner"), prepared_for: "Northgate Airport Authority", job: "108" },
    draft: {
      summary: "Steel erection on the east concourse is complete and passed inspection. Curtain wall installation started on schedule.",
      next: "Roofing begins on the east concourse. Two RFIs on door hardware are with the architect.",
    },
  },
  {
    slug: "route-9-update",
    title: "Route 9 Bridge: owner update",
    description: "Every two weeks to Halden County DOT. Written by the project manager.",
    layout: { ...template("owner"), prepared_for: "Halden County DOT", job: "114" },
    draft: {
      summary: "The span 2 deck pour is complete. Pier 3 rebar is being re-detailed after a design change.",
      next: "Pier 3 rebar inspection, then the span 3 deck forms. We need answers on RFIs 197 and 201 to hold the schedule.",
    },
  },
  {
    slug: "monthly-financial",
    title: "Monthly financial summary",
    description: "After month end, for the owners. Prepared by the finance lead.",
    layout: { ...template("monthly-financial"), prepared_for: null, job: null },
    draft: {
      summary: "Revenue and margin were in line with the plan. Net income held, and cash stayed above four months of operating costs.",
      cash: "Halden County DOT is the only customer more than 60 days late. A call is scheduled this week.",
      outlook: "Data Center Shell billing continues to ramp. Expect a similar month, with Terminal Expansion slowing until curtain wall starts.",
    },
  },
];

/* ---------- the tenant's clean tables (their private database) ---------- */
export const CATALOG_TABLES = [
  { dataset: "job_summary", name: "CLEAN.JOBS", title: "Jobs", description: "Every active job with budget, cost, progress, and status to date.", grain: "One row per active job", sources: "Procore, QuickBooks Online, Excel budgets" },
  { dataset: "cost_trend", name: "CLEAN.JOB_COST_MONTHLY", title: "Job cost by month", description: "Budget for the work done and actual cost for each job, each month.", grain: "One row per job per month", sources: "QuickBooks Online job costs, Excel budgets" },
  { dataset: "change_orders", name: "CLEAN.CHANGE_ORDERS", title: "Change orders", description: "Approved change orders with job, cause, and amount.", grain: "One row per job, cause, and month", sources: "Procore, change order log (Portal form)" },
  { dataset: "rfis", name: "CLEAN.RFIS_OPEN", title: "Open RFIs", description: "RFIs not yet answered, with age and who they're waiting on.", grain: "One row per open RFI", sources: "Procore" },
  { dataset: "rfi_trend", name: "CLEAN.RFI_ACTIVITY_MONTHLY", title: "RFI activity", description: "RFIs opened and answered each month.", grain: "One row per job per month", sources: "Procore" },
  { dataset: "field_reports", name: "APP.FIELD_REPORTS", title: "Field reports", description: "Daily field reports entered by your superintendents in the Portal.", grain: "One row per report", sources: "Daily field report (Portal form)" },
  { dataset: "crew_hours_monthly", name: "CLEAN.CREW_HOURS_MONTHLY", title: "Crew hours by month", description: "Field crew hours and labor cost by job and month.", grain: "One row per job per month", sources: "Field reports, payroll rate table" },
  { dataset: "crew_hours", name: "CLEAN.CREW_HOURS_THIS_WEEK", title: "Crew hours this week", description: "This week's crew hours by job and day.", grain: "One row per job per day", sources: "Field reports" },
  { dataset: "pnl", name: "CLEAN.GL_MONTHLY", title: "General ledger by month", description: "Every income and expense account, summed by month.", grain: "One row per account per month", sources: "QuickBooks Online" },
  { dataset: "revenue_by_customer", name: "CLEAN.REVENUE_BY_CUSTOMER", title: "Revenue by customer", description: "Invoiced revenue by customer and month.", grain: "One row per customer per month", sources: "QuickBooks Online invoices" },
  { dataset: "cash", name: "CLEAN.CASH_MONTHLY", title: "Cash by month", description: "Month-end balance across operating bank accounts.", grain: "One row per month", sources: "QuickBooks Online bank accounts" },
  { dataset: "ar_aging", name: "CLEAN.AR_AGING", title: "Receivables aging", description: "Open customer balances by age bucket.", grain: "One row per customer", sources: "QuickBooks Online invoices and payments" },
  { dataset: "ap_aging", name: "CLEAN.AP_AGING", title: "Payables aging", description: "Open vendor balances by age bucket.", grain: "One row per vendor", sources: "QuickBooks Online bills" },
  { dataset: "vendor_spend", name: "CLEAN.VENDOR_SPEND_MONTHLY", title: "Vendor spend", description: "What you spent with each vendor each month.", grain: "One row per vendor per month", sources: "QuickBooks Online bills" },
];

export const DEFINITIONS = [
  { key: "actual", name: "Spent to date", means: "Every cost posted to a job, including committed subcontracts. Excludes retainage.", formula: "Sum of job costs posted in QuickBooks plus open commitments in Procore", sources: "QuickBooks Online job costs + Procore commitments", owner: "Project controls" },
  { key: "budget", name: "Budget", means: "The current approved budget for the job, including approved change orders.", formula: "Original budget + approved change orders", sources: "Excel budgets (SharePoint) + Procore change orders", owner: "Project controls" },
  { key: "earned", name: "Budget for work done", means: "How much of the budget the work completed so far was supposed to cost.", formula: "Budget × percent complete", sources: "Excel budgets + daily field reports", owner: "Project controls" },
  { key: "cpi", name: "Cost performance", means: "Budget for the work actually done, divided by what it cost. 1.00 or higher means on or under budget.", formula: "Budget for work done ÷ Spent to date", sources: "Excel budgets + QuickBooks Online job costs", owner: "Project controls" },
  { key: "over", name: "Cost vs. budget for work done", means: "What the work done so far cost, minus what it was budgeted to cost. Positive means over budget.", formula: "Spent to date − Budget for work done", sources: "Excel budgets + QuickBooks Online job costs", owner: "Finance lead" },
  { key: "pct_complete", name: "Percent complete", means: "The superintendent's latest estimate of how much of the job is done.", formula: "Latest value from the daily field report", sources: "Daily field reports (Portal form)", owner: "Superintendents" },
  { key: "rfis", name: "Open RFIs", means: "Requests for information sent to the design team and not yet answered.", formula: "Count of RFIs with status Open", sources: "Procore RFIs", owner: "PM team" },
  { key: "change_orders", name: "Change orders", means: "Approved change orders, grouped by what caused them.", formula: "Sum of approved change-order amounts", sources: "Procore change orders + change order log (Portal form)", owner: "Project controls" },
  { key: "crew_hours", name: "Crew hours", means: "Total hours worked by field crews, as reported each day.", formula: "Sum of crew hours from daily field reports", sources: "Daily field reports (Portal form)", owner: "Superintendents" },
  { key: "revenue", name: "Revenue", means: "Income invoiced in the period: contract billings plus service and small projects. Excludes sales tax.", formula: "Sum of invoice lines posted to income accounts", sources: "QuickBooks Online invoices", owner: "Finance lead" },
  { key: "gross_margin", name: "Gross margin", means: "What's left from revenue after the direct cost of doing the work, as a share of revenue.", formula: "(Revenue − Cost of goods sold) ÷ Revenue", sources: "QuickBooks Online profit and loss", owner: "Finance lead" },
  { key: "opex", name: "Operating expenses", means: "Costs of running the company that aren't tied to one job: office salaries, rent, insurance, vehicles, software.", formula: "Sum of expense accounts outside cost of goods sold", sources: "QuickBooks Online profit and loss", owner: "Finance lead" },
  { key: "net_income", name: "Net income", means: "Profit after every cost in the period.", formula: "Revenue − Cost of goods sold − Operating expenses", sources: "QuickBooks Online profit and loss", owner: "Finance lead" },
  { key: "cash", name: "Cash on hand", means: "Balance across operating bank accounts at the end of the month.", formula: "Sum of bank account balances at month end", sources: "QuickBooks Online bank accounts", owner: "Finance lead" },
  { key: "ar_outstanding", name: "Customers owe you", means: "Invoices sent and not yet paid, grouped by how long they've been open.", formula: "Open invoice balances by days since invoice date", sources: "QuickBooks Online invoices and payments", owner: "Accounts receivable" },
  { key: "ar_over_60", name: "Owed for over 60 days", means: "Unpaid invoice balances more than 60 days old. The early warning for cash.", formula: "Open balances in the 61–90 and 90+ day buckets", sources: "QuickBooks Online invoices and payments", owner: "Accounts receivable" },
  { key: "ap_outstanding", name: "You owe vendors", means: "Bills received and not yet paid, grouped by how long they've been open.", formula: "Open bill balances by days since bill date", sources: "QuickBooks Online bills", owner: "Accounts payable" },
  { key: "ap_due_7d", name: "Due in the next 7 days", means: "Bills whose due date falls in the next seven days.", formula: "Open bills with due date ≤ today + 7", sources: "QuickBooks Online bills", owner: "Accounts payable" },
  { key: "labor_cost", name: "Labor cost", means: "Crew hours priced at the blended field labor rate.", formula: "Crew hours × $68 blended rate", sources: "Daily field reports + payroll rate table", owner: "Finance lead" },
];

export const FLAGS = [
  { title: "Job 114 has $6,200 in costs but no matching budget line.", detail: "A bill from Keystone Rebar was coded to Route 9 Bridge under cost code 03-210, which isn't in the job's budget.", source: "QuickBooks Online", job: "114", severity: "review", question: "Add a budget line, or was it coded to the wrong job?", options: ["Add a budget line", "Wrong job — recode in QuickBooks"] },
  { title: "A −$3,480 cost on Route 9 Bridge.", detail: "A negative job cost was posted on Sept 26 with no linked credit memo.", source: "QuickBooks Online", job: "114", severity: "review", question: "A real credit from a supplier, or an entry error?", options: ["Real credit", "Entry error — fix in QuickBooks"] },
  { title: "Two subcontracts for $48,500, one day apart.", detail: "Both are with Delta Mechanical on Data Center Shell, with the same scope description.", source: "Procore", job: "121", severity: "urgent", question: "Two separate contracts, or one entered twice?", options: ["Two contracts", "Entered twice — fix in Procore"] },
  { title: "RFI 212 isn't linked to any job.", detail: "The RFI was created without a project, so it isn't counted in any job's open RFIs.", source: "Procore", job: null, severity: "review", question: "Which job does it belong to?", options: ["Terminal Expansion", "Medical Office Building"] },
  { title: "The Medical Office Building budget sheet is 9 days old.", detail: "Every other budget sheet in the folder was updated this week.", source: "Excel budgets (SharePoint)", job: "133", severity: "info", question: "Is a newer budget coming?", options: ["Newer budget coming", "This one is current"] },
  { title: "“ABC Concrete” and “ABC Concrete LLC” matched as one vendor.", detail: "Same tax ID and address in QuickBooks. Matched automatically by the cleaning rules.", source: "QuickBooks Online", job: null, severity: "info", question: null, options: null, status: "auto_fixed", resolution: "Matched automatically" },
];

export const SOURCES = [
  { provider: "quickbooks_online", name: "QuickBooks Online", tier: "A", connection: "Official connection (read-only)", status: "healthy", rows: 184_220, streams: ["Bills", "Invoices", "Journal entries", "Vendors", "Customers", "Classes"] },
  { provider: "procore", name: "Procore", tier: "A", connection: "Official connection (read-only)", status: "healthy", rows: 52_880, streams: ["Projects", "Budgets", "Commitments", "Change orders", "RFIs"] },
  { provider: "sharepoint", name: "Excel budgets (SharePoint folder)", tier: "A", connection: "Folder sync (read-only)", status: "healthy", rows: 1_240, streams: ["Job budgets"] },
  { provider: "portal", name: "Forms (this Portal)", tier: "internal", connection: "Entered by your team", status: "healthy", rows: 0, streams: ["Daily field reports", "Change order log"] },
  { provider: "adp", name: "ADP payroll", tier: "A", connection: "Official connection (read-only)", status: "reconnect", rows: 8_410, streams: ["Pay rates", "Hours"] },
];

export const CHECKS = [
  { name: "Every cost has a job", source: "QuickBooks Online", status: "warn", detail: "1 cost posted to a cost code with no budget line (see Flags)." },
  { name: "No duplicate subcontracts", source: "Procore", status: "warn", detail: "2 subcontracts look like the same one entered twice (see Flags)." },
  { name: "Budget sheets updated this week", source: "Excel budgets (SharePoint)", status: "warn", detail: "1 of 5 sheets is older than 7 days." },
  { name: "Vendor names match across systems", source: "QuickBooks Online + Procore", status: "pass", detail: "412 vendors matched. 3 matched automatically this week." },
  { name: "Job codes match across systems", source: "QuickBooks Online + Procore", status: "pass", detail: "All 5 active jobs match." },
  { name: "No negative costs without a credit memo", source: "QuickBooks Online", status: "warn", detail: "1 negative cost with no credit memo (see Flags)." },
  { name: "Change orders have a cause", source: "Procore", status: "pass", detail: "All 63 approved change orders have a cause." },
  { name: "RFIs are linked to a job", source: "Procore", status: "warn", detail: "1 RFI has no job (see Flags)." },
  { name: "Field reports within normal hours", source: "Portal forms", status: "pass", detail: "No crew-hour entries above 400 hours in a day." },
  { name: "Totals match the source", source: "QuickBooks Online", status: "pass", detail: "Job-cost totals match QuickBooks to the cent." },
  { name: "Data arrived on schedule", source: "All sources", status: "pass", detail: "Every scheduled update ran in the last 24 hours, except ADP payroll." },
  { name: "Payroll connection is current", source: "ADP payroll", status: "fail", detail: "The connection expired. An admin needs to reconnect it." },
];

export const DEMO_PERSONAS = [
  { persona: "owner", email: "dana.reyes@summitbuilders.example", name: "Dana Reyes", title: "Chief operating officer", role: "owner", scope: null },
  { persona: "pm", email: "marcus.lee@summitbuilders.example", name: "Marcus Lee", title: "Project manager, Route 9 Bridge", role: "editor", scope: ["114"] },
  { persona: "field", email: "luis.ortiz@summitbuilders.example", name: "Luis Ortiz", title: "Superintendent", role: "contributor", scope: ["114", "121"] },
  { persona: "viewer", email: "priya.shah@summitbuilders.example", name: "Priya Shah", title: "Chief financial officer", role: "viewer", scope: null },
];

export const DEMO_OTHER_MEMBERS = [
  { email: "sam.patel@summitbuilders.example", name: "Sam Patel", title: "Office manager", role: "admin", status: "active" },
  { email: "jordan.kim@summitbuilders.example", name: "Jordan Kim", title: "Estimator", role: "viewer", status: "invited" },
];

/* Insight Reviews for the last two complete months. The figures are computed
   from the published sample data at each reset, so the analyst's review
   always matches the dashboards. Wording is the analyst's. */
type DS = Record<string, Record<string, unknown>[]>;
const n = (v: unknown) => Number(v) || 0;
const money = (v: number) => (Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${Math.round(v / 1000)}K`);
const pctTxt = (v: number) => `${(v * 100).toFixed(1)}%`;
const monthName = (ym: string) => new Date(`${ym}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
const shortMonth = (ym: string) => new Date(`${ym}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
const addM = (ym: string, k: number) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + k, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const change = (a: number, b: number) => `${a >= b ? "▲" : "▼"} ${Math.abs(Math.round(((a - b) / Math.abs(b || 1)) * 100))}%`;

export function buildReviews(ds: DS, asOf: Date) {
  const cur = asOf.toISOString().slice(0, 7);
  const L = addM(cur, -1), P = addM(cur, -2), PP = addM(cur, -3);
  const sec = (m: string, section: string) => ds.pnl.filter((r) => r.month === m && r.section === section).reduce((t, r) => t + n(r.amount), 0);
  const rev = (m: string) => sec(m, "Revenue");
  const gm = (m: string) => (rev(m) - sec(m, "Cost of goods sold")) / (rev(m) || 1);
  const net = (m: string) => rev(m) - sec(m, "Cost of goods sold") - sec(m, "Operating expenses");
  const jobs = [...ds.job_summary].sort((a, b) => n(a.cpi) - n(b.cpi));
  const worst = jobs[0];
  const ar = [...ds.ar_aging].map((r) => ({ customer: String(r.customer), over: n(r.d61_90) + n(r.d90p) })).sort((a, b) => b.over - a.over);
  const over60 = ar.reduce((t, r) => t + r.over, 0);
  const co = ds.change_orders;
  const share = (rows: Record<string, unknown>[]) => rows.filter((r) => r.cause === "Design errors").reduce((t, r) => t + n(r.amount), 0) / (rows.reduce((t, r) => t + n(r.amount), 0) || 1);
  const wShare = share(co.filter((r) => r.job === worst.job));
  const oShare = share(co.filter((r) => r.job !== worst.job));
  const rfi = (m: string) => {
    const rows = ds.rfi_trend.filter((r) => r.month === m);
    return { o: rows.reduce((t, r) => t + n(r.opened), 0), c: rows.reduce((t, r) => t + n(r.closed), 0) };
  };
  const cash = (m: string) => n(ds.cash.find((r) => r.month === m)?.balance);
  const due = (d: number) => `${shortMonth(cur)} ${d}`;
  const rP = rfi(P);
  const gmDelta = (gm(L) - gm(P)) * 100;

  return [
    {
      period: L,
      title: `${monthName(L)} ${L.slice(0, 4)} review`,
      analyst: "Avery Collins, numarket analyst",
      content: {
        summary: `Margins ${gmDelta >= 0 ? "held" : "slipped"} and cash ${cash(L) >= cash(P) ? "grew" : "dipped"}, but one job and one customer need attention. ${worst.name} is the only job running over budget for the work done, and ${ar[0].customer} is paying slowly.`,
        changed: [
          { metric: "Revenue", value: money(rev(L)), change: `${change(rev(L), rev(P))} vs ${monthName(P)}`, note: "Billing follows the job schedules; no surprises in the mix." },
          { metric: "Gross margin", value: pctTxt(gm(L)), change: `${gmDelta >= 0 ? "▲" : "▼"} ${Math.abs(gmDelta).toFixed(1)} pts`, note: "Equipment and subcontractor costs were in line with budget." },
          { metric: `${worst.name} cost performance`, value: n(worst.cpi).toFixed(2), change: "Below 1.00", note: "Still the only job spending more than budgeted for the work done." },
          { metric: "Owed for over 60 days", value: money(over60), change: `${money(ar[0].over)} from one customer`, note: `Most of it is ${ar[0].customer}.` },
        ],
        risks: [
          { title: `${worst.name} design errors`, detail: `Design errors are ${Math.round(wShare * 100)}% of this job's change-order dollars, against ${Math.round(oShare * 100)}% on your other jobs. Each one also adds an RFI cycle.` },
          { title: `${ar[0].customer} payment`, detail: `${money(ar[0].over)} is more than 60 days old. Their last two payments took 70+ days, so this may be their normal cycle, but it ties up cash during the busiest part of the job.` },
          { title: "Medical Office Building budget sheet", detail: "The budget sheet hasn't been updated in 9 days while costs post daily, so cost performance there is less reliable until it's refreshed." },
        ],
        recommendations: [
          { title: "Review design-error change orders with the engineer of record", detail: "Bring the five largest to Thursday's meeting and ask whether the drawings need a revision cycle.", owner: "Marcus Lee", due: due(9) },
          { title: `Call ${ar[0].customer} accounts payable`, detail: "Confirm the open invoices are approved and ask for their payment date.", owner: "Priya Shah", due: due(7) },
          { title: "Refresh the Medical Office Building budget sheet", detail: "Update it in the SharePoint folder; the next overnight update picks it up.", owner: "Project controls", due: due(8) },
        ],
        usage: { rows: "184,000 new rows", allowance: "58% of your platform allowance", note: "Steady. No change needed." },
        next: `${monthName(cur)} review: ${monthName(addM(cur, 1))} 4`,
      },
    },
    {
      period: P,
      title: `${monthName(P)} ${P.slice(0, 4)} review`,
      analyst: "Avery Collins, numarket analyst",
      content: {
        summary: "Costs and billing tracked plan on four of five jobs. Two vendors were matched automatically, and a duplicate subcontract was caught before it reached a report.",
        changed: [
          { metric: "Revenue", value: money(rev(P)), change: `${change(rev(P), rev(PP))} vs ${monthName(PP)}`, note: "In line with the schedule." },
          { metric: "Net income", value: money(net(P)), change: `${change(net(P), net(PP))} vs ${monthName(PP)}`, note: "Insurance renewal posted this month." },
          { metric: "RFIs", value: `${rP.o} opened, ${rP.c} answered`, change: `Backlog ${rP.o >= rP.c ? "▲" : "▼"} ${Math.abs(rP.o - rP.c)}`, note: `Mostly ${worst.name}.` },
        ],
        risks: [{ title: `RFI backlog on ${worst.name}`, detail: "RFIs are being opened faster than they're answered for the third month in a row." }],
        recommendations: [{ title: "Weekly RFI review with the design team", detail: "Fifteen minutes on Tuesdays, oldest first.", owner: "Marcus Lee", due: `${shortMonth(L)} 2` }],
        usage: { rows: "171,000 new rows", allowance: "55% of your platform allowance", note: "Steady." },
        next: `${monthName(L)} review: ${monthName(cur)} 6`,
      },
    },
  ];
}
