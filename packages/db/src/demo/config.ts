/* Configuration for a sample construction workspace: dashboards, input
   screens, and reports are assembled from building blocks as data, not code
   ("configure, don't code", Spec §0). Business definitions, flags, sources,
   and data checks are sample content. All of it is fictional. */

const rev = { field: "amount", where: { section: "Revenue" } };
const cogs = { field: "amount", where: { section: "Cost of goods sold" } };
const opex = { field: "amount", where: { section: "Operating expenses" } };
const aging = [
  { field: "current", label: "Current" },
  { field: "d1_30", label: "1–30 days" },
  { field: "d31_60", label: "31–60 days" },
  { field: "d61_90", label: "61–90 days" },
  { field: "d90p", label: "Over 90 days" },
];
const agingCols = (first: string, label: string) => [
  { field: first, label },
  { field: "current", label: "Current", format: "money" },
  { field: "d1_30", label: "1–30", format: "money" },
  { field: "d31_60", label: "31–60", format: "money" },
  { field: "d61_90", label: "61–90", format: "money" },
  { field: "d90p", label: "90+", format: "money" },
  { field: "total", label: "Total", format: "money" },
];

const k = {
  revenue: { type: "kpi", title: "Revenue", dataset: "pnl", value: { agg: "sum", of: rev }, format: "money", compare: true, better: "up", definition: "revenue" },
  grossMargin: { type: "kpi", title: "Gross margin", dataset: "pnl", value: { agg: "ratio", num: { plus: [rev], minus: [cogs] }, den: rev }, format: "pct", compare: true, better: "up", definition: "gross_margin" },
  grossProfit: { type: "kpi", title: "Gross profit", dataset: "pnl", value: { agg: "sum", of: { plus: [rev], minus: [cogs] } }, format: "money", compare: true, better: "up", definition: "gross_margin" },
  opex: { type: "kpi", title: "Operating expenses", dataset: "pnl", value: { agg: "sum", of: opex }, format: "money", compare: true, better: "down", definition: "opex" },
  netIncome: { type: "kpi", title: "Net income", dataset: "pnl", value: { agg: "sum", of: { plus: [rev], minus: [cogs, opex] } }, format: "money", compare: true, better: "up", definition: "net_income" },
  cash: { type: "kpi", title: "Cash on hand", dataset: "cash", value: { agg: "last", of: "balance", by: "month" }, format: "money", compare: true, better: "up", definition: "cash" },
  spent: { type: "kpi", title: "Spent to date", dataset: "job_summary", value: { agg: "sum", of: "actual" }, format: "money", definition: "actual" },
  jobCost: { type: "kpi", title: "Job cost in period", dataset: "cost_trend", value: { agg: "sum", of: "actual" }, format: "money", compare: true, definition: "actual" },
  cpi: { type: "kpi", title: "Cost performance", dataset: "job_summary", value: { agg: "ratio", num: "earned", den: "actual" }, format: "dec2", better: "up", definition: "cpi" },
  over: { type: "kpi", title: "Cost vs. budget for work done", dataset: "job_summary", value: { agg: "sum", of: { plus: ["actual"], minus: ["earned"] } }, format: "over", better: "down", definition: "over" },
  rfis: { type: "kpi", title: "Open RFIs", dataset: "job_summary", value: { agg: "sum", of: "open_rfis" }, format: "num", definition: "rfis" },
  crewWeek: { type: "kpi", title: "Crew hours this week", dataset: "crew_hours", value: { agg: "sum", of: "hours" }, format: "hours", definition: "crew_hours" },
  laborWeek: { type: "kpi", title: "Labor cost this week", dataset: "crew_hours", value: { agg: "sum", of: "labor_cost" }, format: "money", definition: "labor_cost" },
  arTotal: { type: "kpi", title: "Customers owe you", dataset: "ar_aging", value: { agg: "sum", of: "total" }, format: "money", definition: "ar_outstanding" },
  arOver60: { type: "kpi", title: "Owed for over 60 days", dataset: "ar_aging", value: { agg: "sum", of: { plus: ["d61_90", "d90p"] } }, format: "money", definition: "ar_over_60" },
};

const jobsTable = {
  type: "table",
  title: "Jobs",
  dataset: "job_summary",
  sort: { field: "cpi", dir: "asc" },
  totals: true,
  columns: [
    { field: "name", label: "Job" },
    { field: "customer", label: "Customer" },
    { field: "pct_complete", label: "Complete", format: "pct", definition: "pct_complete" },
    { field: "budget", label: "Budget", format: "money", definition: "budget" },
    { field: "actual", label: "Spent", format: "money", definition: "actual" },
    { field: "cpi", label: "Cost perf.", format: "dec2", definition: "cpi" },
    { field: "open_rfis", label: "Open RFIs", format: "num", definition: "rfis" },
    { field: "status", label: "Status", format: "status" },
  ],
  span: 3,
};
const costTrend = { type: "trend", title: "Budget for work done vs. actual cost", dataset: "cost_trend", x: "month", series: [{ label: "Budget for work done", of: "earned" }, { label: "Actual cost", of: "actual" }], format: "money", definition: "cpi", span: 2 };
const coByCause = { type: "bar", title: "Change orders by cause", dataset: "change_orders", category: "cause", of: "amount", format: "money", definition: "change_orders" };

export const DASHBOARDS = [
  {
    slug: "financials",
    title: "Financial overview",
    description: "Revenue, profit, cash, and who owes whom.",
    layout: {
      wholeCompany: true,
      source: "QuickBooks Online",
      filters: { date: true },
      pages: [
        {
          slug: "overview",
          title: "Overview",
          rows: [
            [k.revenue, k.grossMargin, k.netIncome, k.cash],
            [
              { type: "columns", title: "Revenue and costs by month", dataset: "pnl", x: "month", series: [{ label: "Revenue", of: rev }, { label: "Costs", of: { plus: [cogs, opex] } }], format: "money", span: 2 },
              { type: "bar", title: "Revenue by customer", dataset: "revenue_by_customer", category: "customer", of: "amount", format: "money", limit: 8, definition: "revenue" },
            ],
            [
              { type: "trend", title: "Net income by month", dataset: "pnl", x: "month", series: [{ label: "Net income", of: { plus: [rev], minus: [cogs, opex] } }], format: "money", definition: "net_income", span: 2 },
              { type: "trend", title: "Cash on hand", dataset: "cash", x: "month", series: [{ label: "Month-end cash", of: "balance" }], format: "money", definition: "cash" },
            ],
          ],
        },
        {
          slug: "profit-loss",
          title: "Profit & loss",
          rows: [
            [k.revenue, k.grossProfit, k.opex, k.netIncome],
            [
              {
                type: "statement", title: "Profit and loss statement", dataset: "pnl", span: 3, percentOf: "Revenue",
                groups: ["Revenue", "Cost of goods sold", "Operating expenses"],
                subtotals: [
                  { label: "Gross profit", after: "Cost of goods sold", plus: ["Revenue"], minus: ["Cost of goods sold"] },
                  { label: "Net income", after: "Operating expenses", plus: ["Revenue"], minus: ["Cost of goods sold", "Operating expenses"] },
                ],
              },
            ],
          ],
        },
        {
          slug: "receivables",
          title: "Receivables",
          rows: [
            [k.arTotal, k.arOver60, { type: "kpi", title: "Share over 60 days", dataset: "ar_aging", value: { agg: "ratio", num: { plus: ["d61_90", "d90p"] }, den: "total" }, format: "pct", definition: "ar_over_60" }],
            [
              { type: "stacked", title: "Who owes you, by age", dataset: "ar_aging", category: "customer", segments: aging, format: "money", span: 2, definition: "ar_outstanding" },
              { type: "trend", title: "Cash on hand", dataset: "cash", x: "month", series: [{ label: "Month-end cash", of: "balance" }], format: "money", definition: "cash" },
            ],
            [{ type: "table", title: "Aging by customer", dataset: "ar_aging", columns: agingCols("customer", "Customer"), sort: { field: "total", dir: "desc" }, totals: true, span: 3 }],
          ],
        },
        {
          slug: "payables",
          title: "Payables",
          rows: [
            [
              { type: "kpi", title: "You owe vendors", dataset: "ap_aging", value: { agg: "sum", of: "total" }, format: "money", definition: "ap_outstanding" },
              { type: "kpi", title: "Due in the next 7 days", dataset: "ap_aging", value: { agg: "sum", of: "due_7d" }, format: "money", definition: "ap_due_7d" },
              { type: "kpi", title: "Over 60 days", dataset: "ap_aging", value: { agg: "sum", of: { plus: ["d61_90", "d90p"] } }, format: "money", definition: "ap_outstanding" },
            ],
            [
              { type: "stacked", title: "What you owe, by age", dataset: "ap_aging", category: "vendor", segments: aging, format: "money", span: 2, definition: "ap_outstanding" },
              { type: "bar", title: "Spend by vendor", dataset: "vendor_spend", category: "vendor", of: "amount", format: "money", limit: 8 },
            ],
            [{ type: "table", title: "Aging by vendor", dataset: "ap_aging", columns: [...agingCols("vendor", "Vendor"), { field: "due_7d", label: "Due in 7 days", format: "money" }], sort: { field: "total", dir: "desc" }, totals: true, span: 3 }],
          ],
        },
      ],
    },
  },
  {
    slug: "projects",
    title: "Projects",
    description: "Every job's cost, progress, change orders, RFIs, and field hours.",
    layout: {
      source: "Procore, QuickBooks Online, and your input screens",
      filters: { date: true, job: true },
      pages: [
        {
          slug: "portfolio",
          title: "Portfolio",
          rows: [[k.jobCost, k.cpi, k.over, k.rfis], [costTrend, coByCause], [jobsTable]],
        },
        {
          slug: "change-orders",
          title: "Change orders",
          rows: [
            [
              { type: "kpi", title: "Change orders approved", dataset: "change_orders", value: { agg: "sum", of: "amount" }, format: "money", compare: true, better: "down", definition: "change_orders" },
              { type: "kpi", title: "Number approved", dataset: "change_orders", value: { agg: "count" }, format: "num", compare: true, better: "down" },
              { type: "kpi", title: "Average size", dataset: "change_orders", value: { agg: "ratio", num: "amount", den: "count" }, format: "money", compare: true },
            ],
            [{ type: "columns", title: "Change orders by month", dataset: "change_orders", x: "month", series: [{ label: "Approved", of: "amount" }], format: "money", span: 2, definition: "change_orders" }, coByCause],
            [{ type: "table", title: "Change orders by job", dataset: "change_orders", groupBy: { by: ["job_name"], sum: ["count", "amount"] }, columns: [{ field: "job_name", label: "Job" }, { field: "count", label: "Change orders", format: "num" }, { field: "amount", label: "Amount", format: "money" }], sort: { field: "amount", dir: "desc" }, totals: true, span: 3 }],
          ],
        },
        {
          slug: "rfis",
          title: "RFIs",
          rows: [
            [
              k.rfis,
              { type: "kpi", title: "RFIs opened", dataset: "rfi_trend", value: { agg: "sum", of: "opened" }, format: "num", compare: true, better: "down", definition: "rfis" },
              { type: "kpi", title: "RFIs answered", dataset: "rfi_trend", value: { agg: "sum", of: "closed" }, format: "num", compare: true, better: "up", definition: "rfis" },
            ],
            [
              { type: "columns", title: "RFIs opened and answered", dataset: "rfi_trend", x: "month", series: [{ label: "Opened", of: "opened" }, { label: "Answered", of: "closed" }], format: "num", span: 2 },
              { type: "bar", title: "Open RFIs by job", dataset: "job_summary", category: "name", of: "open_rfis", format: "num", definition: "rfis" },
            ],
            [{ type: "table", title: "Oldest open RFIs", dataset: "rfis", limit: 10, sort: { field: "days_open", dir: "desc" }, span: 3, columns: [{ field: "number", label: "RFI" }, { field: "job_name", label: "Job" }, { field: "subject", label: "Subject" }, { field: "ball_in_court", label: "Waiting on" }, { field: "days_open", label: "Days open", format: "num" }] }],
          ],
        },
        {
          slug: "field-hours",
          title: "Field hours",
          rows: [
            [k.crewWeek, k.laborWeek, { type: "kpi", title: "Crew hours in period", dataset: "crew_hours_monthly", value: { agg: "sum", of: "hours" }, format: "hours", compare: true, definition: "crew_hours" }],
            [
              { type: "trend", title: "Crew hours by month", dataset: "crew_hours_monthly", x: "month", series: [{ label: "Crew hours", of: "hours" }], format: "hours", span: 2, definition: "crew_hours" },
              { type: "bar", title: "This week, by day", dataset: "crew_hours", category: "day", of: "hours", format: "hours", keepOrder: true },
            ],
            [
              { type: "bar", title: "This week, by job", dataset: "crew_hours", category: "job_name", of: "hours", format: "hours", definition: "crew_hours" },
              { type: "table", title: "Latest field reports", dataset: "field_reports", limit: 10, span: 2, columns: [{ field: "date", label: "Date", format: "date" }, { field: "job_name", label: "Job" }, { field: "crew_hours", label: "Crew hours", format: "hours" }, { field: "by", label: "Entered by" }, { field: "note", label: "Note" }] },
            ],
          ],
        },
      ],
    },
  },
];

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

export const REPORTS = [
  {
    slug: "weekly-status",
    title: "Weekly status report",
    description: "The Monday report for the leadership team. Numbers fill in from your data; your team writes the commentary.",
    layout: {
      prepared_for: null,
      job: null,
      period: "week",
      sections: [
        { type: "commentary", key: "summary", title: "Summary", placeholder: "What happened across the jobs this week." },
        { type: "kpis", blocks: [k.spent, k.cpi, k.over, k.rfis] },
        { type: "block", block: { ...jobsTable, title: "Projects at a glance" } },
        { type: "block", block: { ...costTrend, title: "Budget for work done vs. actual cost, last 12 months" } },
        { type: "block", block: coByCause },
        { type: "block", block: { type: "bar", title: "Crew hours this week, by job", dataset: "crew_hours", category: "job_name", of: "hours", format: "hours" } },
        { type: "commentary", key: "risks", title: "Risks and issues", placeholder: "What could slip, and what you're doing about it." },
        { type: "commentary", key: "next", title: "Next week", placeholder: "The few things that matter next week." },
      ],
    },
    draft: {
      summary: "Terminal Expansion passed its steel inspection on the east concourse. Data Center Shell is ahead of budget for the work done so far, and Substation Upgrade is on track to finish in November.",
      risks: "Route 9 Bridge is running over budget for the work done, driven by design-error change orders. Twenty-one RFIs are open there, five of them for more than three weeks. Halden County DOT has $212K outstanding past 60 days.",
      next: "Resolve the five oldest RFIs on Route 9 Bridge. Review design-error change orders with the engineer of record on Thursday. Follow up on the Halden County DOT payment.",
    },
  },
  {
    slug: "owner-report-108",
    title: "Owner report: Terminal Expansion",
    description: "Sent to the project owner every two weeks, in their branding.",
    layout: {
      prepared_for: "Northgate Airport Authority",
      job: "108",
      period: "two weeks",
      sections: [
        { type: "commentary", key: "summary", title: "Progress", placeholder: "Progress since the last report." },
        { type: "kpis", blocks: [k.spent, k.cpi, { type: "kpi", title: "Complete", dataset: "job_summary", value: { agg: "avg", of: "pct_complete" }, format: "pct", definition: "pct_complete" }, k.rfis] },
        { type: "block", block: { ...costTrend, title: "Budget for work done vs. actual cost", span: 3 } },
        { type: "commentary", key: "next", title: "Coming up", placeholder: "Milestones in the next two weeks." },
      ],
    },
    draft: {
      summary: "Steel erection on the east concourse is complete and passed inspection. Curtain wall installation started on schedule.",
      next: "Roofing begins on the east concourse. Two RFIs on door hardware are with the architect.",
    },
  },
];

export const DEFINITIONS = [
  { key: "actual", name: "Spent to date", means: "Every cost posted to a job, including committed subcontracts. Excludes retainage.", formula: "Sum of job costs posted in QuickBooks plus open commitments in Procore", sources: "QuickBooks Online job costs + Procore commitments", owner: "Project controls" },
  { key: "budget", name: "Budget", means: "The current approved budget for the job, including approved change orders.", formula: "Original budget + approved change orders", sources: "Excel budgets (SharePoint) + Procore change orders", owner: "Project controls" },
  { key: "earned", name: "Budget for work done", means: "How much of the budget the work completed so far was supposed to cost.", formula: "Budget × percent complete", sources: "Excel budgets + daily field reports", owner: "Project controls" },
  { key: "cpi", name: "Cost performance", means: "Budget for the work actually done, divided by what it cost. 1.00 or higher means on or under budget.", formula: "Budget for work done ÷ Spent to date", sources: "Excel budgets + QuickBooks Online job costs", owner: "Project controls" },
  { key: "over", name: "Cost vs. budget for work done", means: "What the work done so far cost, minus what it was budgeted to cost. Positive means over budget.", formula: "Spent to date − Budget for work done", sources: "Excel budgets + QuickBooks Online job costs", owner: "Finance lead" },
  { key: "pct_complete", name: "Percent complete", means: "The superintendent's latest estimate of how much of the job is done.", formula: "Latest value from the daily field report", sources: "Daily field reports (input screen)", owner: "Superintendents" },
  { key: "rfis", name: "Open RFIs", means: "Requests for information sent to the design team and not yet answered.", formula: "Count of RFIs with status Open", sources: "Procore RFIs", owner: "PM team" },
  { key: "change_orders", name: "Change orders", means: "Approved change orders, grouped by what caused them.", formula: "Sum of approved change-order amounts", sources: "Procore change orders + change order log (input screen)", owner: "Project controls" },
  { key: "crew_hours", name: "Crew hours", means: "Total hours worked by field crews, as reported each day.", formula: "Sum of crew hours from daily field reports", sources: "Daily field reports (input screen)", owner: "Superintendents" },
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
  { provider: "portal", name: "Input screens (this Portal)", tier: "internal", connection: "Entered by your team", status: "healthy", rows: 0, streams: ["Daily field reports", "Change order log"] },
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
  { name: "Field reports within normal hours", source: "Input screens", status: "pass", detail: "No crew-hour entries above 400 hours in a day." },
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
