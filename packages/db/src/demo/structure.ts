/* The structure every sample workspace shares: dashboards, report
   templates, and on-demand reports, built from building blocks. Each industry
   passes its own words (Vocab) and a few facts; the blocks are the same. */
import type { Vocab } from "./vocab";

export type StructureOpts = { causes: readonly string[]; projectSource: string; ownerReport: { name: string; about: string } };

export function structure(v: Vocab, o: StructureOpts) {
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
  jobCost: { type: "kpi", title: `${v.Job} cost in period`, dataset: "cost_trend", value: { agg: "sum", of: "actual" }, format: "money", compare: true, definition: "actual" },
  cpi: { type: "kpi", title: "Cost performance", dataset: "job_summary", value: { agg: "ratio", num: "earned", den: "actual" }, format: "dec2", better: "up", definition: "cpi" },
  over: { type: "kpi", title: "Cost vs. budget for work done", dataset: "job_summary", value: { agg: "sum", of: { plus: ["actual"], minus: ["earned"] } }, format: "over", better: "down", definition: "over" },
  rfis: { type: "kpi", title: v.rfiShort, dataset: "job_summary", value: { agg: "sum", of: "open_rfis" }, format: "num", definition: "rfis" },
  crewWeek: { type: "kpi", title: `${v.Hours} this week`, dataset: "crew_hours", value: { agg: "sum", of: "hours" }, format: "hours", definition: "crew_hours" },
  laborWeek: { type: "kpi", title: `${v.laborCost} this week`, dataset: "crew_hours", value: { agg: "sum", of: "labor_cost" }, format: "money", definition: "labor_cost" },
  arTotal: { type: "kpi", title: `${v.Customers} owe you`, dataset: "ar_aging", value: { agg: "sum", of: "total" }, format: "money", definition: "ar_outstanding" },
  arOver60: { type: "kpi", title: "Owed for over 60 days", dataset: "ar_aging", value: { agg: "sum", of: { plus: ["d61_90", "d90p"] } }, format: "money", definition: "ar_over_60" },
};

const jobsTable = {
  type: "table",
  title: v.Jobs,
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
    { field: "open_rfis", label: v.rfiShort, format: "num", definition: "rfis" },
    { field: "status", label: "Status", format: "status" },
  ],
  span: 3,
};
const costTrend = { type: "trend", title: "Budget for work done vs. actual cost", dataset: "cost_trend", x: "month", series: [{ label: "Budget for work done", of: "earned" }, { label: "Actual cost", of: "actual" }], format: "money", definition: "cpi", span: 2 };
const coByCause = { type: "bar", title: `${v.ChangeOrders} by cause`, dataset: "change_orders", category: "cause", of: "amount", format: "money", definition: "change_orders" };

const dashboards = [
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
              { type: "bar", title: `Revenue by ${v.customer}`, dataset: "revenue_by_customer", category: "customer", of: "amount", format: "money", limit: 8, definition: "revenue" },
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
            [{ type: "table", title: `Aging by ${v.customer}`, dataset: "ar_aging", columns: agingCols("customer", v.Customer), sort: { field: "total", dir: "desc" }, totals: true, span: 3 }],
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
    description: `Every ${v.job}'s cost, progress, ${v.changeOrders}, ${v.rfis}, and ${v.hoursPage.toLowerCase()}.`,
    layout: {
      source: o.projectSource,
      filters: { date: true, job: true },
      pages: [
        {
          slug: "portfolio",
          title: "Portfolio",
          rows: [[k.jobCost, k.cpi, k.over, k.rfis], [costTrend, coByCause], [jobsTable]],
        },
        {
          slug: "change-orders",
          title: v.ChangeOrders,
          rows: [
            [
              { type: "kpi", title: `${v.ChangeOrders} approved`, dataset: "change_orders", value: { agg: "sum", of: "amount" }, format: "money", compare: true, better: "down", definition: "change_orders" },
              { type: "kpi", title: "Number approved", dataset: "change_orders", value: { agg: "count" }, format: "num", compare: true, better: "down" },
              { type: "kpi", title: "Average size", dataset: "change_orders", value: { agg: "ratio", num: "amount", den: "count" }, format: "money", compare: true },
            ],
            [{ type: "columns", title: `${v.ChangeOrders} by month`, dataset: "change_orders", x: "month", series: [{ label: "Approved", of: "amount" }], format: "money", span: 2, definition: "change_orders" }, coByCause],
            [{ type: "table", title: `${v.ChangeOrders} by ${v.job}`, dataset: "change_orders", groupBy: { by: ["job_name"], sum: ["count", "amount"] }, columns: [{ field: "job_name", label: v.Job }, { field: "count", label: v.ChangeOrders, format: "num" }, { field: "amount", label: "Amount", format: "money" }], sort: { field: "amount", dir: "desc" }, totals: true, span: 3 }],
          ],
        },
        {
          slug: "rfis",
          title: v.Rfis,
          rows: [
            [
              k.rfis,
              { type: "kpi", title: `${v.Rfis} opened`, dataset: "rfi_trend", value: { agg: "sum", of: "opened" }, format: "num", compare: true, better: "down", definition: "rfis" },
              { type: "kpi", title: `${v.Rfis} answered`, dataset: "rfi_trend", value: { agg: "sum", of: "closed" }, format: "num", compare: true, better: "up", definition: "rfis" },
            ],
            [
              { type: "columns", title: `${v.Rfis} opened and answered`, dataset: "rfi_trend", x: "month", series: [{ label: "Opened", of: "opened" }, { label: "Answered", of: "closed" }], format: "num", span: 2 },
              { type: "bar", title: `${v.rfiShort} by ${v.job}`, dataset: "job_summary", category: "name", of: "open_rfis", format: "num", definition: "rfis" },
            ],
            [{ type: "table", title: `Oldest open ${v.rfis}`, dataset: "rfis", limit: 10, sort: { field: "days_open", dir: "desc" }, span: 3, columns: [{ field: "number", label: v.rfiCol }, { field: "job_name", label: v.Job }, { field: "subject", label: "Subject" }, { field: "ball_in_court", label: "Waiting on" }, { field: "days_open", label: "Days open", format: "num" }] }],
          ],
        },
        {
          slug: "field-hours",
          title: v.hoursPage,
          rows: [
            [k.crewWeek, k.laborWeek, { type: "kpi", title: `${v.Hours} in period`, dataset: "crew_hours_monthly", value: { agg: "sum", of: "hours" }, format: "hours", compare: true, definition: "crew_hours" }],
            [
              { type: "trend", title: `${v.Hours} by month`, dataset: "crew_hours_monthly", x: "month", series: [{ label: v.Hours, of: "hours" }], format: "hours", span: 2, definition: "crew_hours" },
              { type: "bar", title: "This week, by day", dataset: "crew_hours", category: "day", of: "hours", format: "hours", keepOrder: true },
            ],
            [
              { type: "bar", title: `This week, by ${v.job}`, dataset: "crew_hours", category: "job_name", of: "hours", format: "hours", definition: "crew_hours" },
              { type: "table", title: `Latest ${v.fieldReports}`, dataset: "field_reports", limit: 10, span: 2, columns: [{ field: "date", label: "Date", format: "date" }, { field: "job_name", label: v.Job }, { field: "crew_hours", label: v.Hours, format: "hours" }, { field: "by", label: "Entered by" }, { field: "note", label: "Note" }] },
            ],
          ],
        },
      ],
    },
  },
];

/* ---------- status report templates ----------
   Every report is built from sections: commentary written by people, key
   numbers, and charts or tables from the workspace's building blocks. Clients
   can start from a template and change the sections themselves. */

const statement = {
  type: "statement", title: "Profit and loss statement", dataset: "pnl", span: 3, percentOf: "Revenue",
  groups: ["Revenue", "Cost of goods sold", "Operating expenses"],
  subtotals: [
    { label: "Gross profit", after: "Cost of goods sold", plus: ["Revenue"], minus: ["Cost of goods sold"] },
    { label: "Net income", after: "Operating expenses", plus: ["Revenue"], minus: ["Cost of goods sold", "Operating expenses"] },
  ],
};
const arStacked = { type: "stacked", title: "Who owes you, by age", dataset: "ar_aging", category: "customer", segments: aging, format: "money", span: 2, definition: "ar_outstanding" };
const revByCustomer = { type: "bar", title: `Revenue by ${v.customer}`, dataset: "revenue_by_customer", category: "customer", of: "amount", format: "money", limit: 8, definition: "revenue" };
const crewByJob = { type: "bar", title: `${v.Hours} this week, by ${v.job}`, dataset: "crew_hours", category: "job_name", of: "hours", format: "hours", definition: "crew_hours" };
const commentary = (key: string, title: string, placeholder: string) => ({ type: "commentary", key, title, placeholder });

const reportTemplates = [
  {
    key: "weekly",
    name: "Weekly status report",
    about: `For the leadership team every Monday: summary, key numbers, every ${v.job} at a glance, cost and ${v.changeOrders}, ${v.hoursPage.toLowerCase()}, a financial snapshot, risks, and next week.`,
    layout: {
      period: "week", range: "12m", wholeCompany: true,
      sections: [
        commentary("summary", "Summary", `What happened across the ${v.jobs} this week.`),
        { type: "kpis", blocks: [k.spent, k.cpi, k.over, k.rfis] },
        { type: "block", block: { ...jobsTable, title: "Projects at a glance" } },
        { type: "block", block: { ...costTrend, title: "Budget for work done vs. actual cost" } },
        { type: "block", block: coByCause },
        { type: "block", block: crewByJob },
        commentary("money", "Financial snapshot", "Billing, margin, and cash in a few lines."),
        { type: "kpis", blocks: [k.revenue, k.netIncome, k.cash, k.arOver60] },
        commentary("risks", "Risks and issues", "What could slip, and what you're doing about it."),
        commentary("next", "Next week", "The few things that matter next week."),
      ],
    },
  },
  {
    key: "owner",
    name: o.ownerReport.name,
    about: o.ownerReport.about,
    layout: {
      period: "two weeks", range: "12m",
      sections: [
        commentary("summary", "Progress", "Progress since the last report."),
        { type: "kpis", blocks: [k.spent, k.cpi, { type: "kpi", title: "Complete", dataset: "job_summary", value: { agg: "avg", of: "pct_complete" }, format: "pct", definition: "pct_complete" }, k.rfis] },
        { type: "block", block: { ...costTrend, title: "Budget for work done vs. actual cost", span: 3 } },
        { type: "block", block: coByCause },
        commentary("next", "Coming up", "Milestones in the next two weeks."),
      ],
    },
  },
  {
    key: "monthly-financial",
    name: "Monthly financial summary",
    about: "For owners and the board after month end: revenue, margin, net income and cash against the prior month, the P&L, who owes you, and the outlook.",
    layout: {
      period: "month", range: "lm", wholeCompany: true,
      sections: [
        commentary("summary", "The month in brief", "Three or four sentences on how the month went."),
        { type: "kpis", blocks: [k.revenue, k.grossMargin, k.netIncome, k.cash] },
        { type: "block", block: statement },
        { type: "pagebreak" },
        { type: "block", block: revByCustomer },
        { type: "block", block: arStacked },
        commentary("cash", "Cash and collections", "Anything slow to pay, and what you're doing about it."),
        commentary("outlook", "Outlook", "What next month looks like."),
      ],
    },
  },
  {
    key: "blank",
    name: "Blank report",
    about: "Start with one summary section and add what you need.",
    layout: { period: "week", range: "12m", sections: [commentary("summary", "Summary", "Write your summary here.")] },
  },
];
/* ---------- data reports (run on demand) ---------- */
const moneyCol = (field: string, label: string) => ({ field, label, format: "money" });
const monthCol = { field: "month", label: "Month", format: "month" };
const dataReports = [
  {
    slug: "job-cost", title: `${v.Job} cost by month`, category: "Projects",
    description: `Budget for the work done and actual cost, by ${v.job} or by month.`,
    definition: {
      dataset: "cost_trend", filters: { date: true, job: true },
      groupings: [
        { key: "job", label: `By ${v.job}`, columns: [{ field: "job_name", label: v.Job }, moneyCol("earned", "Budget for work done"), moneyCol("actual", "Actual cost")], groupBy: { by: ["job_name"], sum: ["earned", "actual"] }, sort: { field: "actual", dir: "desc" } },
        { key: "month", label: "By month", columns: [monthCol, moneyCol("earned", "Budget for work done"), moneyCol("actual", "Actual cost")], groupBy: { by: ["month"], sum: ["earned", "actual"] }, sort: { field: "month", dir: "asc" } },
        { key: "detail", label: "Every row", columns: [monthCol, { field: "job_name", label: v.Job }, moneyCol("earned", "Budget for work done"), moneyCol("actual", "Actual cost")], sort: { field: "month", dir: "desc" } },
      ],
    },
  },
  {
    slug: "change-orders", title: `${v.ChangeOrder} log`, category: "Projects",
    description: `Approved ${v.changeOrders} by ${v.job}, cause, or month.`,
    definition: {
      dataset: "change_orders", filters: { date: true, job: true },
      groupings: [
        { key: "detail", label: `Every ${v.changeOrder}`, columns: [monthCol, { field: "job_name", label: v.Job }, { field: "cause", label: "Cause" }, moneyCol("amount", "Amount")], sort: { field: "month", dir: "desc" } },
        { key: "job", label: `By ${v.job}`, columns: [{ field: "job_name", label: v.Job }, { field: "count", label: "Count", format: "num" }, moneyCol("amount", "Amount")], groupBy: { by: ["job_name"], sum: ["count", "amount"] }, sort: { field: "amount", dir: "desc" } },
        { key: "cause", label: "By cause", columns: [{ field: "cause", label: "Cause" }, { field: "count", label: "Count", format: "num" }, moneyCol("amount", "Amount")], groupBy: { by: ["cause"], sum: ["count", "amount"] }, sort: { field: "amount", dir: "desc" } },
        { key: "month", label: "By month", columns: [monthCol, { field: "count", label: "Count", format: "num" }, moneyCol("amount", "Amount")], groupBy: { by: ["month"], sum: ["count", "amount"] }, sort: { field: "month", dir: "asc" } },
      ],
    },
  },
  {
    slug: "open-rfis", title: `Open ${v.rfis}`, category: "Projects",
    description: `Every open ${v.rfi}, oldest first, with who it's waiting on.`,
    definition: {
      dataset: "rfis", filters: { job: true },
      groupings: [{ key: "detail", label: `Every ${v.rfi}`, columns: [{ field: "number", label: v.rfiCol }, { field: "job_name", label: v.Job }, { field: "subject", label: "Subject" }, { field: "ball_in_court", label: "Waiting on" }, { field: "opened", label: "Opened", format: "date" }, { field: "days_open", label: "Days open", format: "num" }], sort: { field: "days_open", dir: "desc" } }],
    },
  },
  {
    slug: "field-reports", title: v.FieldReports, category: "Projects",
    description: `${v.fieldReportsLong} as entered, or ${v.hours} by ${v.job}.`,
    definition: {
      dataset: "field_reports", filters: { date: true, job: true },
      groupings: [
        { key: "detail", label: "Every report", columns: [{ field: "date", label: "Date", format: "date" }, { field: "job_name", label: v.Job }, { field: "crew_hours", label: v.Hours, format: "hours" }, { field: "by", label: "Entered by" }, { field: "note", label: "Note" }, { field: "via", label: "From" }], sort: { field: "date", dir: "desc" } },
        { key: "job", label: `By ${v.job}`, columns: [{ field: "job_name", label: v.Job }, { field: "crew_hours", label: v.Hours, format: "hours" }], groupBy: { by: ["job_name"], sum: ["crew_hours"] }, sort: { field: "crew_hours", dir: "desc" } },
      ],
    },
  },
  {
    slug: "pnl-by-account", title: "Profit and loss by account", category: "Financials",
    description: "Every income and expense account for the period, or by month.",
    definition: {
      dataset: "pnl", wholeCompany: true, filters: { date: true },
      groupings: [
        { key: "account", label: "By account", columns: [{ field: "section", label: "Section" }, { field: "account", label: "Account" }, moneyCol("amount", "Amount")], groupBy: { by: ["section", "account", "sort"], sum: ["amount"] }, sort: { field: "sort", dir: "asc" } },
        { key: "month", label: "By month and section", columns: [monthCol, { field: "section", label: "Section" }, moneyCol("amount", "Amount")], groupBy: { by: ["month", "section"], sum: ["amount"] }, sort: { field: "month", dir: "asc" } },
      ],
    },
  },
  {
    slug: "revenue-by-customer", title: `Revenue by ${v.customer}`, category: "Financials",
    description: `Invoiced revenue by ${v.customer} or by month.`,
    definition: {
      dataset: "revenue_by_customer", wholeCompany: true, filters: { date: true },
      groupings: [
        { key: "customer", label: `By ${v.customer}`, columns: [{ field: "customer", label: v.Customer }, moneyCol("amount", "Revenue")], groupBy: { by: ["customer"], sum: ["amount"] }, sort: { field: "amount", dir: "desc" } },
        { key: "month", label: "By month", columns: [monthCol, moneyCol("amount", "Revenue")], groupBy: { by: ["month"], sum: ["amount"] }, sort: { field: "month", dir: "asc" } },
        { key: "detail", label: "Every row", columns: [monthCol, { field: "customer", label: v.Customer }, moneyCol("amount", "Revenue")], sort: { field: "month", dir: "desc" } },
      ],
    },
  },
  {
    slug: "ar-aging", title: "Receivables aging", category: "Financials",
    description: `What each ${v.customer} owes, by how long it's been open. As of today.`,
    definition: { dataset: "ar_aging", wholeCompany: true, filters: {}, groupings: [{ key: "detail", label: `By ${v.customer}`, columns: agingCols("customer", v.Customer), sort: { field: "total", dir: "desc" } }] },
  },
  {
    slug: "ap-aging", title: "Payables aging", category: "Financials",
    description: "What you owe each vendor, by how long it's been open. As of today.",
    definition: { dataset: "ap_aging", wholeCompany: true, filters: {}, groupings: [{ key: "detail", label: "By vendor", columns: [...agingCols("vendor", "Vendor"), moneyCol("due_7d", "Due in 7 days")], sort: { field: "total", dir: "desc" } }] },
  },
  {
    slug: "vendor-spend", title: "Spend by vendor", category: "Financials",
    description: "What you spent with each vendor, or by month.",
    definition: {
      dataset: "vendor_spend", wholeCompany: true, filters: { date: true },
      groupings: [
        { key: "vendor", label: "By vendor", columns: [{ field: "vendor", label: "Vendor" }, moneyCol("amount", "Spend")], groupBy: { by: ["vendor"], sum: ["amount"] }, sort: { field: "amount", dir: "desc" } },
        { key: "month", label: "By month", columns: [monthCol, moneyCol("amount", "Spend")], groupBy: { by: ["month"], sum: ["amount"] }, sort: { field: "month", dir: "asc" } },
      ],
    },
  },
];


  return { k, dashboards, reportTemplates, dataReports, jobsTable, costTrend, coByCause };
}
