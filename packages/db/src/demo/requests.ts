/* Sample cards for the Requests board, so the demo opens with work in every
   column: a dashboard change waiting for sign-off, an app being built, an
   issue just reported, and finished work. Fictional, like the rest of the
   sample data. `by` is the persona who asked; updates from numarket have
   `by: null`. */
import type { Industry } from "./vocab";
import type { RequestKind, RequestProduct, RequestStatus, SketchBlock } from "../repo/requests";

export type SampleUpdate = { by: string | null; daysAgo: number; body: string; status?: RequestStatus };
export type SampleRequest = {
  by: string;
  kind: RequestKind;
  product: RequestProduct;
  title: string;
  detail: string;
  status: RequestStatus;
  priority?: "low" | "normal" | "high";
  link?: string;
  sketch?: SketchBlock[];
  hours?: number;
  quote?: number;
  assignee?: string;
  updates: SampleUpdate[];
};

const AVERY = "Avery Collins";
const ENGINEER = "Jordan Blake";

const CONSTRUCTION: SampleRequest[] = [
  {
    by: "dana.reyes@summitbuilders.example",
    kind: "change",
    product: "workspace",
    title: "Add a 13-week cash forecast to Financial overview",
    detail: "We want to see cash coming in and going out for the next 13 weeks, by week, with the big payments called out.",
    status: "review",
    link: "/dashboards/financials",
    sketch: ["kpis", "bars", "table"],
    hours: 3,
    assignee: AVERY,
    updates: [
      { by: "dana.reyes@summitbuilders.example", daysAgo: 12, body: "We want to see cash coming in and going out for the next 13 weeks.", status: "submitted" },
      { by: null, daysAgo: 11, body: "Planned for next week. About 3 change hours; you have 6 this month.", status: "planned" },
      { by: null, daysAgo: 6, body: "Building it from receivables, payables, and the billing schedule.", status: "in_progress" },
      { by: null, daysAgo: 1, body: "Ready: Financial overview → Cash forecast. Approve it, or tell us what to change.", status: "review" },
    ],
  },
  {
    by: "dana.reyes@summitbuilders.example",
    kind: "app",
    product: "engineering",
    title: "Subcontractor pay application tracker",
    detail: "Pay apps arrive as PDFs by email. We want each one logged against the subcontract, checked against percent complete, and approved in one place.",
    status: "in_progress",
    priority: "high",
    quote: 14_500,
    assignee: ENGINEER,
    updates: [
      { by: "dana.reyes@summitbuilders.example", daysAgo: 21, body: "Pay apps arrive as PDFs by email and get lost.", status: "submitted" },
      { by: null, daysAgo: 16, body: "Quoted: $14,500, about 3 weeks. Approved by Dana Reyes.", status: "planned" },
      { by: null, daysAgo: 9, body: "Started. The first version is ready for a walkthrough on Thursday.", status: "in_progress" },
    ],
  },
  {
    by: "marcus.lee@summitbuilders.example",
    kind: "change",
    product: "workspace",
    title: "Show retainage held on the Projects dashboard",
    detail: "Retainage by job, and when it's due back to us.",
    status: "planned",
    link: "/dashboards/projects",
    sketch: ["kpis", "table"],
    hours: 2,
    assignee: AVERY,
    updates: [
      { by: "marcus.lee@summitbuilders.example", daysAgo: 5, body: "Retainage by job, and when it's due back to us.", status: "submitted" },
      { by: null, daysAgo: 4, body: "Planned after the cash forecast. About 2 change hours.", status: "planned" },
    ],
  },
  {
    by: "priya.shah@summitbuilders.example",
    kind: "improvement",
    product: "foundation",
    title: "Match Procore vendor names to QuickBooks",
    detail: "The same vendor shows up three ways in spend reports.",
    status: "in_progress",
    assignee: AVERY,
    updates: [
      { by: "priya.shah@summitbuilders.example", daysAgo: 8, body: "Keystone Rebar shows up three different ways.", status: "submitted" },
      { by: null, daysAgo: 3, body: "Adding a matching rule. 41 vendor names map to 17 vendors.", status: "in_progress" },
    ],
  },
  {
    by: "dana.reyes@summitbuilders.example",
    kind: "issue",
    product: "foundation",
    title: "ADP payroll asks to be reconnected",
    detail: "Data health says ADP needs reconnecting. Who does that?",
    status: "submitted",
    priority: "high",
    updates: [
      { by: "dana.reyes@summitbuilders.example", daysAgo: 0, body: "Data health says ADP needs reconnecting. Who does that?", status: "submitted" },
      { by: null, daysAgo: 0, body: "Received. Your analyst replies within 4 business hours." },
    ],
  },
  {
    by: "dana.reyes@summitbuilders.example",
    kind: "improvement",
    product: "insight",
    title: "Add a safety section to the monthly review",
    detail: "Recordables and near misses by job, next to cost and schedule.",
    status: "submitted",
    updates: [{ by: "dana.reyes@summitbuilders.example", daysAgo: 2, body: "Recordables and near misses by job, next to cost and schedule.", status: "submitted" }],
  },
  {
    by: "marcus.lee@summitbuilders.example",
    kind: "issue",
    product: "foundation",
    title: "Crew hours doubled on Route 9 Bridge for Sep 30",
    detail: "The field hours chart shows twice the hours for the last day of September.",
    status: "done",
    assignee: AVERY,
    updates: [
      { by: "marcus.lee@summitbuilders.example", daysAgo: 18, body: "The field hours chart shows twice the hours for Sep 30.", status: "submitted" },
      { by: null, daysAgo: 17, body: "Two daily reports were entered for the same day. We kept the later one and added a check: one report per job per day.", status: "done" },
    ],
  },
  {
    by: "dana.reyes@summitbuilders.example",
    kind: "change",
    product: "workspace",
    title: "Split change orders by cause",
    detail: "Design errors, owner changes, unforeseen conditions, separately.",
    status: "done",
    link: "/dashboards/projects",
    sketch: ["bars"],
    hours: 2,
    assignee: AVERY,
    updates: [
      { by: "dana.reyes@summitbuilders.example", daysAgo: 34, body: "Design errors, owner changes, unforeseen conditions, separately.", status: "submitted" },
      { by: null, daysAgo: 30, body: "Live on Projects → Change orders.", status: "review" },
      { by: "dana.reyes@summitbuilders.example", daysAgo: 29, body: "Looks right. Thanks.", status: "done" },
    ],
  },
];

const CONSTRUCTION_QUESTIONS: SampleRequest[] = [
  {
    by: "priya.shah@summitbuilders.example",
    kind: "question",
    product: "insight",
    title: "Why did gross margin drop in September?",
    detail: "Margin looks lower than August. Is it something to worry about?",
    status: "done",
    link: "/dashboards/financials?page=profit-loss",
    assignee: AVERY,
    updates: [
      { by: "priya.shah@summitbuilders.example", daysAgo: 6, body: "Margin looks lower than August. Is it something to worry about?", status: "submitted" },
      {
        by: null,
        daysAgo: 6,
        body: "Two things, both explainable. Route 9 Bridge took on design-error change orders that aren't billed yet, and there was a one-time $38K equipment repair. Without those, margin was 18.9%. Billing the approved change orders in October recovers most of it, so no action beyond that.",
        status: "done",
      },
    ],
  },
  {
    by: "marcus.lee@summitbuilders.example",
    kind: "question",
    product: "insight",
    title: "Is Route 9 Bridge getting better or worse?",
    detail: "Cost performance is 0.94. Is that trending up since we started the weekly RFI review?",
    status: "submitted",
    link: "/dashboards/projects?job=114",
    updates: [
      { by: "marcus.lee@summitbuilders.example", daysAgo: 0, body: "Cost performance is 0.94. Is that trending up since we started the weekly RFI review?", status: "submitted" },
      { by: null, daysAgo: 0, body: "Received. Your analyst replies within 4 business hours." },
    ],
  },
];

const SERVICES: SampleRequest[] = [
  {
    by: "morgan.hale@brightline.example",
    kind: "change",
    product: "workspace",
    title: "Add utilization by consultant",
    detail: "Billable hours over available hours, by person, by month.",
    status: "review",
    link: "/dashboards/projects",
    sketch: ["kpis", "heatmap"],
    hours: 3,
    assignee: AVERY,
    updates: [
      { by: "morgan.hale@brightline.example", daysAgo: 9, body: "Billable hours over available hours, by person, by month.", status: "submitted" },
      { by: null, daysAgo: 8, body: "Planned. About 3 change hours.", status: "planned" },
      { by: null, daysAgo: 1, body: "Ready on Projects → Utilization. Approve it, or tell us what to change.", status: "review" },
    ],
  },
  {
    by: "morgan.hale@brightline.example",
    kind: "app",
    product: "engineering",
    title: "Statement of work builder",
    detail: "Build a statement of work from past projects' real hours, like the estimate builder.",
    status: "planned",
    quote: 9_800,
    assignee: ENGINEER,
    updates: [
      { by: "morgan.hale@brightline.example", daysAgo: 12, body: "Build SOWs from past projects' real hours.", status: "submitted" },
      { by: null, daysAgo: 7, body: "Quoted: $9,800, about 2 weeks. Starts after the November close.", status: "planned" },
    ],
  },
  {
    by: "elena.park@brightline.example",
    kind: "issue",
    product: "foundation",
    title: "Time entries from Friday are missing",
    detail: "Nina's Friday hours don't show on the dashboard.",
    status: "in_progress",
    priority: "high",
    assignee: AVERY,
    updates: [
      { by: "elena.park@brightline.example", daysAgo: 1, body: "Nina's Friday hours don't show on the dashboard.", status: "submitted" },
      { by: null, daysAgo: 0, body: "Found it: the entries are dated Saturday. Fixing the date check now.", status: "in_progress" },
    ],
  },
  {
    by: "david.chen@brightline.example",
    kind: "improvement",
    product: "insight",
    title: "Compare margins to last year in the review",
    detail: "",
    status: "done",
    assignee: AVERY,
    updates: [
      { by: "david.chen@brightline.example", daysAgo: 30, body: "Can the review compare margins to the same month last year?", status: "submitted" },
      { by: null, daysAgo: 26, body: "Added to every review from October on.", status: "done" },
    ],
  },
];

const SERVICES_QUESTIONS: SampleRequest[] = [
  {
    by: "david.chen@brightline.example",
    kind: "question",
    product: "insight",
    title: "Why did billable hours dip in August?",
    detail: "",
    status: "done",
    link: "/dashboards/projects?page=field-hours",
    assignee: AVERY,
    updates: [
      { by: "david.chen@brightline.example", daysAgo: 9, body: "Billable hours dipped in August. Anything we should do?", status: "submitted" },
      { by: null, daysAgo: 8, body: "Two consultants were on vacation and Northfield paused for sign-off. September is back to plan, so no action needed.", status: "done" },
    ],
  },
];

export function sampleRequests(industry: Industry): SampleRequest[] {
  return industry === "services" ? [...SERVICES, ...SERVICES_QUESTIONS] : [...CONSTRUCTION, ...CONSTRUCTION_QUESTIONS];
}
export const SAMPLE_ANALYST = AVERY;
