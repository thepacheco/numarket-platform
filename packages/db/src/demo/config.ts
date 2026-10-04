/* Configuration for a sample construction workspace: dashboards, input
   screens, and reports are assembled from building blocks as data, not code
   ("configure, don't code", Spec §0). Business definitions, flags, sources,
   and data checks are sample content. All of it is fictional. */

const kpis = [
  { type: "kpi", title: "Spent to date", dataset: "job_summary", value: { agg: "sum", field: "actual" }, format: "money", definition: "actual" },
  { type: "kpi", title: "Cost performance", dataset: "job_summary", value: { agg: "ratio", num: "earned", den: "actual" }, format: "dec2", better: "up", definition: "cpi" },
  { type: "kpi", title: "Cost vs. budget for work done", dataset: "job_summary", value: { agg: "diff", a: "actual", b: "earned" }, format: "over", better: "down", definition: "over" },
  { type: "kpi", title: "Open RFIs", dataset: "job_summary", value: { agg: "sum", field: "open_rfis" }, format: "num", better: "down", definition: "rfis" },
];

const jobsTable = {
  type: "table",
  title: "Jobs",
  dataset: "job_summary",
  sort: { field: "cpi", dir: "asc" },
  columns: [
    { field: "name", label: "Job" },
    { field: "pct_complete", label: "Complete", format: "pct", definition: "pct_complete" },
    { field: "budget", label: "Budget", format: "money", definition: "budget" },
    { field: "actual", label: "Spent", format: "money", definition: "actual" },
    { field: "cpi", label: "Cost perf.", format: "dec2", definition: "cpi" },
    { field: "open_rfis", label: "Open RFIs", format: "num", definition: "rfis" },
    { field: "status", label: "Status", format: "status" },
  ],
  span: 3,
};

export const DASHBOARDS = [
  {
    slug: "portfolio",
    title: "Portfolio",
    description: "Every job's cost, progress, and open RFIs in one place.",
    layout: {
      filters: [{ field: "job", label: "Job", dataset: "job_summary", labelField: "name" }],
      rows: [
        kpis,
        [
          { type: "trend", title: "Budget for work done vs. actual cost, by month", dataset: "cost_trend", x: "month", series: [{ field: "earned", label: "Budget for work done" }, { field: "actual", label: "Actual cost" }], format: "money", definition: "cpi", span: 2 },
          { type: "bar", title: "Change orders by cause", dataset: "change_orders", category: "cause", value: "amount", format: "money", definition: "change_orders" },
        ],
        [jobsTable],
        [
          {
            type: "table", title: "Oldest open RFIs", dataset: "rfis", limit: 8, sort: { field: "days_open", dir: "desc" }, span: 3,
            columns: [{ field: "number", label: "RFI" }, { field: "job_name", label: "Job" }, { field: "subject", label: "Subject" }, { field: "ball_in_court", label: "Waiting on" }, { field: "days_open", label: "Days open", format: "num" }],
          },
        ],
      ],
    },
  },
  {
    slug: "field-hours",
    title: "Field hours",
    description: "Crew hours and labor cost this week, from the daily field reports.",
    layout: {
      filters: [{ field: "job", label: "Job", dataset: "job_summary", labelField: "name" }],
      rows: [
        [
          { type: "kpi", title: "Crew hours this week", dataset: "crew_hours", value: { agg: "sum", field: "hours" }, format: "hours", definition: "crew_hours" },
          { type: "kpi", title: "Labor cost this week", dataset: "crew_hours", value: { agg: "sum", field: "labor_cost" }, format: "money", definition: "labor_cost" },
          { type: "kpi", title: "Field reports", dataset: "field_reports", value: { agg: "count" }, format: "num" },
        ],
        [
          { type: "bar", title: "Crew hours by job", dataset: "crew_hours", category: "job_name", value: "hours", format: "hours", definition: "crew_hours", span: 2 },
          { type: "bar", title: "Crew hours by day", dataset: "crew_hours", category: "day", value: "hours", format: "hours", keepOrder: true },
        ],
        [
          {
            type: "table", title: "Latest field reports", dataset: "field_reports", limit: 12, span: 3,
            columns: [{ field: "date", label: "Date", format: "date" }, { field: "job_name", label: "Job" }, { field: "crew_hours", label: "Crew hours", format: "hours" }, { field: "by", label: "Entered by" }, { field: "note", label: "Note" }, { field: "via", label: "From" }],
          },
        ],
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
    description: "The Monday report for the leadership team. Numbers fill in from your data; you write the commentary.",
    layout: {
      prepared_for: null,
      job: null,
      sections: [
        { type: "kpis", blocks: kpis },
        { type: "commentary", key: "summary", title: "This week", placeholder: "What happened across the jobs this week." },
        { type: "block", block: { ...jobsTable, title: "Jobs at a glance" } },
        { type: "commentary", key: "risks", title: "Risks and issues", placeholder: "What could slip, and what you're doing about it." },
        { type: "commentary", key: "next", title: "Next week", placeholder: "The few things that matter next week." },
      ],
    },
    draft: {
      summary: "Terminal Expansion passed its steel inspection. Data Center Shell is ahead of budget for the work done so far.",
      risks: "Route 9 Bridge is running over budget for the work done, driven by design-error change orders. Twenty-one RFIs are open there.",
      next: "Resolve the five oldest RFIs on Route 9 Bridge. Review change orders with the design team on Thursday.",
    },
  },
  {
    slug: "owner-report-108",
    title: "Owner report: Terminal Expansion",
    description: "Sent to the project owner every two weeks, in their branding.",
    layout: {
      prepared_for: "Northgate Airport Authority",
      job: "108",
      sections: [
        { type: "kpis", blocks: [kpis[0], kpis[1], { type: "kpi", title: "Complete", dataset: "job_summary", value: { agg: "avg", field: "pct_complete" }, format: "pct", definition: "pct_complete" }] },
        { type: "commentary", key: "summary", title: "Progress", placeholder: "Progress since the last report." },
        { type: "block", block: { type: "trend", title: "Budget for work done vs. actual cost", dataset: "cost_trend", x: "month", series: [{ field: "earned", label: "Budget for work done" }, { field: "actual", label: "Actual cost" }], format: "money", span: 3 } },
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
