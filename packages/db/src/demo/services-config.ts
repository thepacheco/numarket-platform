/* Configuration for the sample professional services workspace (Brightline
   Partners). Same building blocks as construction, the firm's own words and
   sample content. All of it is fictional. */
import { SERVICES_SCOPE_CAUSES } from "./services";
import { structure } from "./structure";
import { SERVICES } from "./vocab";

export const SERVICES_SCREENS = [
  {
    slug: "time-entry",
    title: "Time entry",
    description: "Replaces the timesheet spreadsheet. Consultants log hours against a project from any device.",
    fields: [
      { key: "job", label: "Project", type: "select", options: "jobs", required: true },
      { key: "date", label: "Date", type: "date", required: true, minDaysAgo: 14 },
      { key: "crew_hours", label: "Hours", type: "number", required: true, min: 0.25, max: 80, step: 0.25, help: "Hours worked on this project that day." },
      { key: "pct_complete", label: "Percent complete", type: "number", min: 0, max: 100, step: 1, help: "Optional. Your best estimate for the whole project." },
      { key: "note", label: "Note", type: "text", maxLength: 280 },
    ],
  },
  {
    slug: "scope-change-log",
    title: "Scope change log",
    description: "Log a scope change the day the client approves it, so the budget and the next invoice are right.",
    fields: [
      { key: "job", label: "Project", type: "select", options: "jobs", required: true },
      { key: "cause", label: "Cause", type: "select", options: [...SERVICES_SCOPE_CAUSES], required: true },
      { key: "amount", label: "Amount ($)", type: "number", required: true, min: 100, max: 500_000, step: 1 },
      { key: "description", label: "What changed", type: "text", required: true, maxLength: 200 },
    ],
  },
];

const S = structure(SERVICES, {
  causes: SERVICES_SCOPE_CAUSES,
  projectSource: "HubSpot, QuickBooks Online, and your input screens",
  ownerReport: { name: "Client report for one project", about: "Sent to the client, in your name or theirs: progress, the project's numbers, budget, scope changes, and what's coming up." },
});
export const SERVICES_DASHBOARDS = S.dashboards;
export const SERVICES_REPORT_TEMPLATES = S.reportTemplates;
export const SERVICES_DATA_REPORTS = S.dataReports;
const template = (key: string) => SERVICES_REPORT_TEMPLATES.find((t) => t.key === key)!.layout;

export const SERVICES_REPORTS = [
  {
    slug: "weekly-status",
    title: "Weekly status report",
    description: "The Monday report for the partners. Numbers fill in from your data; the team writes the commentary.",
    layout: { ...template("weekly"), prepared_for: null, job: null },
    draft: {
      summary: "ERP Rollout hit its third milestone and the client signed off on the go-live plan. Data Warehouse Migration is slightly ahead of budget, and Operations Redesign kicked off with the school board.",
      money: "Fees held steady and margins are in line with last month. Cash is healthy; the one slow payer is Northfield Credit Union.",
      risks: "Customer Portal Rebuild is running over budget for the work done, mostly from unclear requirements. Eleven client requests are open there, three of them for more than three weeks. Northfield Credit Union has $59K outstanding past 60 days.",
      next: "Get sign-off on the portal requirements before more build work. Chase the three oldest client requests. Follow up on the Northfield payment.",
    },
  },
  {
    slug: "client-report-201",
    title: "Client report: ERP Rollout",
    description: "Sent to Brightwater Health System every two weeks.",
    layout: { ...template("owner"), prepared_for: "Brightwater Health System", job: "201" },
    draft: {
      summary: "Milestone 3 (finance configuration) is complete and accepted. Training for the finance team starts next week.",
      next: "Data conversion dry run, then the go-live readiness review. We need the final chart of accounts by Friday.",
    },
  },
  {
    slug: "portal-update",
    title: "Customer Portal Rebuild: client update",
    description: "Every two weeks to Northfield Credit Union. Written by the project manager.",
    layout: { ...template("owner"), prepared_for: "Northfield Credit Union", job: "204" },
    draft: {
      summary: "The account dashboard is in testing. Two screens were redesigned after the sponsor's review.",
      next: "Requirements sign-off for payments, then build. We need test logins and the brand guidelines to hold the schedule.",
    },
  },
  {
    slug: "monthly-financial",
    title: "Monthly financial summary",
    description: "After month end, for the partners. Prepared by the finance director.",
    layout: { ...template("monthly-financial"), prepared_for: null, job: null },
    draft: {
      summary: "Fees and margin were in line with plan. Net income held, and cash covers more than three months of payroll.",
      cash: "Northfield Credit Union is the only client more than 60 days late. Their controller says payment is in the next run.",
      outlook: "Data Warehouse Migration billing ramps up. Expect a similar month, with ERP Rollout tapering after go-live.",
    },
  },
];

export const SERVICES_CATALOG_TABLES = [
  { dataset: "job_summary", name: "CLEAN.PROJECTS", title: "Projects", description: "Every active project with budget, cost, progress, and status to date.", grain: "One row per active project", sources: "Time entries, QuickBooks Online, project budgets (Google Sheets)" },
  { dataset: "cost_trend", name: "CLEAN.PROJECT_COST_MONTHLY", title: "Project cost by month", description: "Budget for the work done and actual cost for each project, each month.", grain: "One row per project per month", sources: "Time entries, QuickBooks Online bills, project budgets" },
  { dataset: "change_orders", name: "CLEAN.SCOPE_CHANGES", title: "Scope changes", description: "Approved scope changes with project, cause, and amount.", grain: "One row per project, cause, and month", sources: "Scope change log (input screen)" },
  { dataset: "rfis", name: "CLEAN.CLIENT_REQUESTS_OPEN", title: "Open client requests", description: "Things the team is waiting on from clients, with age and who they're waiting on.", grain: "One row per open request", sources: "HubSpot tickets" },
  { dataset: "rfi_trend", name: "CLEAN.CLIENT_REQUEST_ACTIVITY", title: "Client request activity", description: "Client requests opened and answered each month.", grain: "One row per project per month", sources: "HubSpot tickets" },
  { dataset: "field_reports", name: "APP.TIME_ENTRIES", title: "Time entries", description: "Hours entered by consultants in the Portal.", grain: "One row per entry", sources: "Time entry (input screen)" },
  { dataset: "crew_hours_monthly", name: "CLEAN.HOURS_MONTHLY", title: "Billable hours by month", description: "Billable hours and their cost by project and month.", grain: "One row per project per month", sources: "Time entries, payroll rate table" },
  { dataset: "crew_hours", name: "CLEAN.HOURS_THIS_WEEK", title: "Billable hours this week", description: "This week's hours by project and day.", grain: "One row per project per day", sources: "Time entries" },
  { dataset: "pnl", name: "CLEAN.GL_MONTHLY", title: "General ledger by month", description: "Every income and expense account, summed by month.", grain: "One row per account per month", sources: "QuickBooks Online" },
  { dataset: "revenue_by_customer", name: "CLEAN.REVENUE_BY_CLIENT", title: "Revenue by client", description: "Invoiced fees by client and month.", grain: "One row per client per month", sources: "QuickBooks Online invoices" },
  { dataset: "cash", name: "CLEAN.CASH_MONTHLY", title: "Cash by month", description: "Month-end balance across operating bank accounts.", grain: "One row per month", sources: "QuickBooks Online bank accounts" },
  { dataset: "ar_aging", name: "CLEAN.AR_AGING", title: "Receivables aging", description: "Open client balances by age bucket.", grain: "One row per client", sources: "QuickBooks Online invoices and payments" },
  { dataset: "ap_aging", name: "CLEAN.AP_AGING", title: "Payables aging", description: "Open vendor balances by age bucket.", grain: "One row per vendor", sources: "QuickBooks Online bills" },
  { dataset: "vendor_spend", name: "CLEAN.VENDOR_SPEND_MONTHLY", title: "Vendor spend", description: "What you spent with each vendor each month.", grain: "One row per vendor per month", sources: "QuickBooks Online bills" },
];

export const SERVICES_DEFINITIONS = [
  { key: "actual", name: "Spent to date", means: "Every cost charged to a project: consultant hours at cost, contractors, and project software. Excludes travel billed back to the client.", formula: "Hours × cost rate + contractor bills + project expenses", sources: "Time entries (input screen) + QuickBooks Online bills", owner: "Finance director" },
  { key: "budget", name: "Budget", means: "The current approved cost budget for the project, including approved scope changes.", formula: "Original budget + approved scope changes", sources: "Project budgets (Google Sheets) + scope change log", owner: "Project management office" },
  { key: "earned", name: "Budget for work done", means: "How much of the budget the work completed so far was supposed to cost.", formula: "Budget × percent complete", sources: "Project budgets + time entries", owner: "Project management office" },
  { key: "cpi", name: "Cost performance", means: "Budget for the work actually done, divided by what it cost. 1.00 or higher means on or under budget.", formula: "Budget for work done ÷ Spent to date", sources: "Project budgets + time entries", owner: "Project management office" },
  { key: "over", name: "Cost vs. budget for work done", means: "What the work done so far cost, minus what it was budgeted to cost. Positive means over budget.", formula: "Spent to date − Budget for work done", sources: "Project budgets + time entries", owner: "Finance director" },
  { key: "pct_complete", name: "Percent complete", means: "The project manager's latest estimate of how much of the project is done.", formula: "Latest value from time entries", sources: "Time entries (input screen)", owner: "Project managers" },
  { key: "rfis", name: "Waiting on client", means: "Things the team asked the client for (access, sign-offs, files) that haven't arrived yet.", formula: "Count of open client requests", sources: "HubSpot tickets", owner: "Project managers" },
  { key: "change_orders", name: "Scope changes", means: "Approved changes to what the client is buying, grouped by what caused them.", formula: "Sum of approved scope-change amounts", sources: "Scope change log (input screen)", owner: "Project management office" },
  { key: "crew_hours", name: "Billable hours", means: "Hours consultants logged to client projects.", formula: "Sum of hours from time entries", sources: "Time entries (input screen)", owner: "Project managers" },
  { key: "labor_cost", name: "Cost of hours", means: "Hours priced at the blended consultant cost rate.", formula: "Hours × $85 blended cost rate", sources: "Time entries + payroll rate table", owner: "Finance director" },
  { key: "revenue", name: "Revenue", means: "Fees invoiced in the period: project milestones plus retainers and advisory. Excludes reimbursed travel.", formula: "Sum of invoice lines posted to income accounts", sources: "QuickBooks Online invoices", owner: "Finance director" },
  { key: "gross_margin", name: "Gross margin", means: "What's left from fees after the direct cost of delivering the work, as a share of revenue.", formula: "(Revenue − Cost of delivery) ÷ Revenue", sources: "QuickBooks Online profit and loss", owner: "Finance director" },
  { key: "opex", name: "Operating expenses", means: "Costs of running the firm that aren't tied to one project: admin salaries, rent, insurance, marketing, software.", formula: "Sum of expense accounts outside cost of delivery", sources: "QuickBooks Online profit and loss", owner: "Finance director" },
  { key: "net_income", name: "Net income", means: "Profit after every cost in the period.", formula: "Revenue − Cost of delivery − Operating expenses", sources: "QuickBooks Online profit and loss", owner: "Finance director" },
  { key: "cash", name: "Cash on hand", means: "Balance across operating bank accounts at the end of the month.", formula: "Sum of bank account balances at month end", sources: "QuickBooks Online bank accounts", owner: "Finance director" },
  { key: "ar_outstanding", name: "Clients owe you", means: "Invoices sent and not yet paid, grouped by how long they've been open.", formula: "Open invoice balances by days since invoice date", sources: "QuickBooks Online invoices and payments", owner: "Finance director" },
  { key: "ar_over_60", name: "Owed for over 60 days", means: "Unpaid invoice balances more than 60 days old. The early warning for cash.", formula: "Open balances in the 61–90 and 90+ day buckets", sources: "QuickBooks Online invoices and payments", owner: "Finance director" },
  { key: "ap_outstanding", name: "You owe vendors", means: "Bills received and not yet paid, grouped by how long they've been open.", formula: "Open bill balances by days since bill date", sources: "QuickBooks Online bills", owner: "Operations manager" },
  { key: "ap_due_7d", name: "Due in the next 7 days", means: "Bills whose due date falls in the next seven days.", formula: "Open bills with due date ≤ today + 7", sources: "QuickBooks Online bills", owner: "Operations manager" },
];

export const SERVICES_FLAGS = [
  { title: "22 hours logged to a finished phase on Customer Portal Rebuild.", detail: "Time was entered against Discovery, which was marked complete in August.", source: "Time entries (input screen)", job: "204", severity: "review", question: "Move the hours to Build, or was Discovery reopened?", options: ["Move to Build", "Discovery was reopened"] },
  { title: "A −$1,240 contractor bill on Data Warehouse Migration.", detail: "A negative bill from Atlas Contract Staffing posted on Oct 2 with no linked credit.", source: "QuickBooks Online", job: "212", severity: "review", question: "A real credit, or an entry error?", options: ["Real credit", "Entry error — fix in QuickBooks"] },
  { title: "Milestone 3 on ERP Rollout was invoiced twice.", detail: "Two invoices for $38,500, Sept 30 and Oct 1, with the same milestone description.", source: "QuickBooks Online", job: "201", severity: "urgent", question: "Two milestones, or the same one twice?", options: ["Two milestones", "Invoiced twice — void one in QuickBooks"] },
  { title: "A won HubSpot deal isn't linked to a project.", detail: "The Ashford County Schools phase 2 deal was marked won without a project code.", source: "HubSpot", job: null, severity: "review", question: "Which project does it belong to?", options: ["Operations Redesign", "A new project"] },
  { title: "The Pricing Strategy budget sheet is 12 days old.", detail: "Every other project budget was updated this week.", source: "Project budgets (Google Sheets)", job: "209", severity: "info", question: "Is a newer budget coming?", options: ["Newer budget coming", "This one is current"] },
  { title: "“Northfield CU” and “Northfield Credit Union” matched as one client.", detail: "Same billing address and tax ID in QuickBooks and HubSpot. Matched automatically by the cleaning rules.", source: "QuickBooks Online + HubSpot", job: null, severity: "info", question: null, options: null, status: "auto_fixed", resolution: "Matched automatically" },
];

export const SERVICES_SOURCES = [
  { provider: "quickbooks_online", name: "QuickBooks Online", tier: "A", connection: "Official connection (read-only)", status: "healthy", rows: 46_120, streams: ["Invoices", "Bills", "Journal entries", "Customers", "Vendors", "Classes"] },
  { provider: "hubspot", name: "HubSpot", tier: "A", connection: "Official connection (read-only)", status: "healthy", rows: 12_480, streams: ["Deals", "Companies", "Contacts", "Tickets"] },
  { provider: "google_drive", name: "Project budgets (Google Sheets)", tier: "A", connection: "Folder sync (read-only)", status: "healthy", rows: 640, streams: ["Project budgets"] },
  { provider: "portal", name: "Input screens (this Portal)", tier: "internal", connection: "Entered by your team", status: "healthy", rows: 0, streams: ["Time entries", "Scope change log"] },
  { provider: "gusto", name: "Gusto payroll", tier: "A", connection: "Official connection (read-only)", status: "reconnect", rows: 3_960, streams: ["Payroll runs", "Hours", "Departments"] },
];

export const SERVICES_CHECKS = [
  { name: "Every hour has an open project phase", source: "Time entries", status: "warn", detail: "22 hours logged to a finished phase (see Flags)." },
  { name: "No milestone invoiced twice", source: "QuickBooks Online", status: "warn", detail: "1 milestone looks invoiced twice (see Flags)." },
  { name: "Budget sheets updated this week", source: "Project budgets (Google Sheets)", status: "warn", detail: "1 of 5 sheets is older than 7 days." },
  { name: "Client names match across systems", source: "QuickBooks Online + HubSpot", status: "pass", detail: "38 clients matched. 1 matched automatically this week." },
  { name: "Project codes match across systems", source: "QuickBooks Online + HubSpot", status: "pass", detail: "All 5 active projects match." },
  { name: "No negative bills without a credit", source: "QuickBooks Online", status: "warn", detail: "1 negative bill with no credit (see Flags)." },
  { name: "Scope changes have a cause", source: "Input screens", status: "pass", detail: "All approved scope changes have a cause." },
  { name: "Won deals are linked to a project", source: "HubSpot", status: "warn", detail: "1 won deal has no project (see Flags)." },
  { name: "Time entries within normal hours", source: "Input screens", status: "pass", detail: "No one logged more than 16 hours in a day." },
  { name: "Totals match the source", source: "QuickBooks Online", status: "pass", detail: "Invoice and bill totals match QuickBooks to the cent." },
  { name: "Data arrived on schedule", source: "All sources", status: "pass", detail: "Every scheduled update ran in the last 24 hours, except Gusto payroll." },
  { name: "Payroll connection is current", source: "Gusto payroll", status: "fail", detail: "The connection expired. An admin needs to reconnect it." },
];

export const SERVICES_PERSONAS = [
  { persona: "owner", email: "morgan.hale@brightline.example", name: "Morgan Hale", title: "Managing partner", role: "owner", scope: null },
  { persona: "pm", email: "elena.park@brightline.example", name: "Elena Park", title: "Project manager, Customer Portal Rebuild", role: "editor", scope: ["204"] },
  { persona: "field", email: "nina.brooks@brightline.example", name: "Nina Brooks", title: "Senior consultant", role: "contributor", scope: ["204", "212"] },
  { persona: "viewer", email: "david.chen@brightline.example", name: "David Chen", title: "Finance director", role: "viewer", scope: null },
];

export const SERVICES_OTHER_MEMBERS = [
  { email: "ruth.alvarez@brightline.example", name: "Ruth Alvarez", title: "Operations manager", role: "admin", status: "active" },
  { email: "sam.ito@brightline.example", name: "Sam Ito", title: "Business development", role: "viewer", status: "invited" },
];

/* The analyst's reviews, computed from the published data like construction. */
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

export function buildServicesReviews(ds: DS, asOf: Date) {
  const cur = asOf.toISOString().slice(0, 7);
  const L = addM(cur, -1), P = addM(cur, -2), PP = addM(cur, -3);
  const sec = (m: string, section: string) => ds.pnl.filter((r) => r.month === m && r.section === section).reduce((t, r) => t + n(r.amount), 0);
  const rev = (m: string) => sec(m, "Revenue");
  const gm = (m: string) => (rev(m) - sec(m, "Cost of goods sold")) / (rev(m) || 1);
  const net = (m: string) => rev(m) - sec(m, "Cost of goods sold") - sec(m, "Operating expenses");
  const projects = [...ds.job_summary].sort((a, b) => n(a.cpi) - n(b.cpi));
  const worst = projects[0];
  const ar = [...ds.ar_aging].map((r) => ({ customer: String(r.customer), over: n(r.d61_90) + n(r.d90p) })).sort((a, b) => b.over - a.over);
  const over60 = ar.reduce((t, r) => t + r.over, 0);
  const sc = ds.change_orders;
  const share = (rows: Record<string, unknown>[]) => rows.filter((r) => r.cause === "Unclear requirements").reduce((t, r) => t + n(r.amount), 0) / (rows.reduce((t, r) => t + n(r.amount), 0) || 1);
  const wShare = share(sc.filter((r) => r.job === worst.job));
  const oShare = share(sc.filter((r) => r.job !== worst.job));
  const hours = (m: string) => ds.crew_hours_monthly.filter((r) => r.month === m).reduce((t, r) => t + n(r.hours), 0);
  const req = (m: string) => {
    const rows = ds.rfi_trend.filter((r) => r.month === m);
    return { o: rows.reduce((t, r) => t + n(r.opened), 0), c: rows.reduce((t, r) => t + n(r.closed), 0) };
  };
  const cash = (m: string) => n(ds.cash.find((r) => r.month === m)?.balance);
  const due = (d: number) => `${shortMonth(cur)} ${d}`;
  const rP = req(P);
  const gmDelta = (gm(L) - gm(P)) * 100;

  return [
    {
      period: L,
      title: `${monthName(L)} ${L.slice(0, 4)} review`,
      analyst: "Avery Collins, numarket analyst",
      content: {
        summary: `Margins ${gmDelta >= 0 ? "held" : "slipped"} and cash ${cash(L) >= cash(P) ? "grew" : "dipped"}, but one project and one client need attention. ${worst.name} is the only project running over budget for the work done, and ${ar[0].customer} is paying slowly.`,
        changed: [
          { metric: "Revenue", value: money(rev(L)), change: `${change(rev(L), rev(P))} vs ${monthName(P)}`, note: "Milestones landed on schedule; retainers were steady." },
          { metric: "Gross margin", value: pctTxt(gm(L)), change: `${gmDelta >= 0 ? "▲" : "▼"} ${Math.abs(gmDelta).toFixed(1)} pts`, note: "Contractor use was in line with plan." },
          { metric: `${worst.name} cost performance`, value: n(worst.cpi).toFixed(2), change: "Below 1.00", note: "Still the only project spending more than budgeted for the work done." },
          { metric: "Billable hours", value: `${Math.round(hours(L)).toLocaleString("en-US")} hrs`, change: `${change(hours(L), hours(P))} vs ${monthName(P)}`, note: "Data Warehouse Migration ramped up as planned." },
          { metric: "Owed for over 60 days", value: money(over60), change: `${money(ar[0].over)} from one client`, note: `Most of it is ${ar[0].customer}.` },
        ],
        risks: [
          { title: `${worst.name} requirements`, detail: `Unclear requirements are ${Math.round(wShare * 100)}% of this project's scope-change dollars, against ${Math.round(oShare * 100)}% on your other projects. Each change also adds a round of client requests.` },
          { title: `${ar[0].customer} payment`, detail: `${money(ar[0].over)} is more than 60 days old. Their last two payments took 70+ days, so it may be their normal cycle, but it's a quarter of what clients owe you.` },
          { title: "Pricing Strategy budget sheet", detail: "The budget hasn't been updated in 12 days while hours post daily, so cost performance there is less reliable until it's refreshed." },
        ],
        recommendations: [
          { title: "Hold a requirements sign-off session with the Northfield sponsor", detail: "Walk the payments screens line by line and get written sign-off before more build hours go in.", owner: "Elena Park", due: due(9) },
          { title: `Call ${ar[0].customer} accounts payable`, detail: "Confirm the open invoices are approved and ask for their payment date.", owner: "David Chen", due: due(7) },
          { title: "Refresh the Pricing Strategy budget sheet", detail: "Update it in the shared Google folder; the next overnight update picks it up.", owner: "Project management office", due: due(8) },
        ],
        usage: { rows: "58,000 new rows", allowance: "41% of your platform allowance", note: "Steady. No change needed." },
        next: `${monthName(cur)} review: ${monthName(addM(cur, 1))} 4`,
      },
    },
    {
      period: P,
      title: `${monthName(P)} ${P.slice(0, 4)} review`,
      analyst: "Avery Collins, numarket analyst",
      content: {
        summary: "Hours and billing tracked plan on four of five projects. A duplicate milestone invoice was caught before it went to the client.",
        changed: [
          { metric: "Revenue", value: money(rev(P)), change: `${change(rev(P), rev(PP))} vs ${monthName(PP)}`, note: "In line with the milestone schedule." },
          { metric: "Net income", value: money(net(P)), change: `${change(net(P), net(PP))} vs ${monthName(PP)}`, note: "Annual software renewals posted this month." },
          { metric: "Client requests", value: `${rP.o} opened, ${rP.c} answered`, change: `Backlog ${rP.o >= rP.c ? "▲" : "▼"} ${Math.abs(rP.o - rP.c)}`, note: `Mostly ${worst.name}.` },
        ],
        risks: [{ title: `Waiting on the client on ${worst.name}`, detail: "Requests to the client are being opened faster than they're answered for the third month in a row." }],
        recommendations: [{ title: "Weekly request review with the client sponsor", detail: "Fifteen minutes on Tuesdays, oldest first.", owner: "Elena Park", due: `${shortMonth(L)} 2` }],
        usage: { rows: "54,000 new rows", allowance: "38% of your platform allowance", note: "Steady." },
        next: `${monthName(L)} review: ${monthName(cur)} 6`,
      },
    },
  ];
}
