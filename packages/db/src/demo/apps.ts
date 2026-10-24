/* Sample records for the example Engineering apps, so the demo opens with a
   few approvals waiting and estimates in progress. Fictional, like the rest
   of the sample data. `by` is the persona who created each one. */
import type { Industry } from "./vocab";

export type EstimateLine = { section: string; description: string; qty: number; unit: string; unitCost: number };
export type EstimateData = { name: string; customer: string; lines: EstimateLine[]; overheadPct: number; profitPct: number; contingencyPct: number; note?: string };
export type ApprovalData = { job: string; title: string; cause: string; amount: number; reason: string; decision_note?: string; decided_by_name?: string };
type Sample<T> = { by: string; status: string; daysAgo: number; data: T };

export const ESTIMATE_SECTIONS: Record<Industry, string[]> = {
  construction: ["Labor", "Materials", "Subcontractors", "Equipment", "General conditions"],
  services: ["Consulting hours", "Software and licenses", "Travel", "Third-party services"],
};

const CONSTRUCTION_APPROVALS: Sample<ApprovalData>[] = [
  { by: "marcus.lee@summitbuilders.example", status: "pending", daysAgo: 1, data: { job: "114", title: "Revised rebar spacing at pier 3", cause: "Design errors", amount: 38_600, reason: "RFI 207 answer changed the spacing; Keystone Rebar quoted the extra steel and labor." } },
  { by: "marcus.lee@summitbuilders.example", status: "pending", daysAgo: 2, data: { job: "114", title: "Added guardrail transition per county", cause: "Owner changes", amount: 12_450, reason: "Halden County DOT asked for the newer transition detail at both approaches." } },
  { by: "luis.ortiz@summitbuilders.example", status: "pending", daysAgo: 3, data: { job: "121", title: "Rock excavation at the north footing", cause: "Unforeseen conditions", amount: 21_900, reason: "Hit rock 4 feet above the geotech report's line; 2 extra days of breaker time." } },
  { by: "marcus.lee@summitbuilders.example", status: "approved", daysAgo: 8, data: { job: "114", title: "Temporary shoring redesign", cause: "Design errors", amount: 17_300, reason: "Engineer of record revised the shoring after the October survey.", decision_note: "Approved. Send the backup to the county with this month's pay app.", decided_by_name: "Dana Reyes" } },
  { by: "luis.ortiz@summitbuilders.example", status: "rejected", daysAgo: 12, data: { job: "127", title: "Second crane mobilization", cause: "Scope additions", amount: 9_800, reason: "Crane had to leave for another job and come back.", decision_note: "Our scheduling, not the owner's. Absorb it in general conditions.", decided_by_name: "Dana Reyes" } },
];

const SERVICES_APPROVALS: Sample<ApprovalData>[] = [
  { by: "elena.park@brightline.example", status: "pending", daysAgo: 1, data: { job: "204", title: "Add single sign-on for member accounts", cause: "Client added scope", amount: 18_400, reason: "Northfield asked for SSO in the steering meeting; about 120 hours across two consultants." } },
  { by: "elena.park@brightline.example", status: "pending", daysAgo: 4, data: { job: "204", title: "Rework the loan application flow", cause: "Unclear requirements", amount: 11_200, reason: "Requirements changed after compliance review; second pass on 6 screens." } },
  { by: "nina.brooks@brightline.example", status: "approved", daysAgo: 9, data: { job: "212", title: "Extra data source: legacy freight system", cause: "Client added scope", amount: 14_800, reason: "Meridian found a second system that has to be migrated.", decision_note: "Approved. Bill with the November invoice.", decided_by_name: "Morgan Hale" } },
];

const CONSTRUCTION_ESTIMATES: Sample<EstimateData>[] = [
  {
    by: "dana.reyes@summitbuilders.example",
    status: "sent",
    daysAgo: 5,
    data: {
      name: "Riverside Parking Structure, phase 1",
      customer: "City of Riverside",
      overheadPct: 8,
      profitPct: 7,
      contingencyPct: 5,
      lines: [
        { section: "Labor", description: "Concrete crew, decks and ramps", qty: 6200, unit: "hours", unitCost: 68 },
        { section: "Materials", description: "Ready-mix concrete, 5,000 psi", qty: 3100, unit: "cu yd", unitCost: 172 },
        { section: "Materials", description: "Post-tension tendons", qty: 1, unit: "lot", unitCost: 286_000 },
        { section: "Subcontractors", description: "Electrical and lighting", qty: 1, unit: "lot", unitCost: 412_000 },
        { section: "Equipment", description: "Tower crane, 7 months", qty: 7, unit: "months", unitCost: 38_500 },
        { section: "General conditions", description: "Supervision, trailer, safety", qty: 8, unit: "months", unitCost: 41_000 },
      ],
    },
  },
  {
    by: "dana.reyes@summitbuilders.example",
    status: "draft",
    daysAgo: 1,
    data: {
      name: "Magnolia Health clinic expansion",
      customer: "Magnolia Health Partners",
      overheadPct: 8,
      profitPct: 8,
      contingencyPct: 6,
      lines: [
        { section: "Labor", description: "Framing and drywall crews", qty: 2400, unit: "hours", unitCost: 68 },
        { section: "Subcontractors", description: "Mechanical, electrical, plumbing", qty: 1, unit: "lot", unitCost: 640_000 },
        { section: "Materials", description: "Interior finishes", qty: 1, unit: "lot", unitCost: 185_000 },
      ],
    },
  },
];

const SERVICES_ESTIMATES: Sample<EstimateData>[] = [
  {
    by: "morgan.hale@brightline.example",
    status: "sent",
    daysAgo: 6,
    data: {
      name: "Cobalt Manufacturing: pricing rollout",
      customer: "Cobalt Manufacturing",
      overheadPct: 0,
      profitPct: 0,
      contingencyPct: 10,
      lines: [
        { section: "Consulting hours", description: "Senior consultant", qty: 320, unit: "hours", unitCost: 225 },
        { section: "Consulting hours", description: "Analyst", qty: 480, unit: "hours", unitCost: 150 },
        { section: "Travel", description: "Site visits, 4 trips", qty: 4, unit: "trips", unitCost: 1_800 },
      ],
    },
  },
];

export function sampleApps(industry: Industry) {
  return industry === "services" ? { approvals: SERVICES_APPROVALS, estimates: SERVICES_ESTIMATES } : { approvals: CONSTRUCTION_APPROVALS, estimates: CONSTRUCTION_ESTIMATES };
}

/** Totals for an estimate: direct cost by section, then overhead, contingency, and profit on top. */
export function estimateTotals(e: Pick<EstimateData, "lines" | "overheadPct" | "profitPct" | "contingencyPct">) {
  const bySection = new Map<string, number>();
  for (const l of e.lines) bySection.set(l.section, (bySection.get(l.section) ?? 0) + l.qty * l.unitCost);
  const direct = [...bySection.values()].reduce((t, x) => t + x, 0);
  const overhead = direct * (e.overheadPct / 100);
  const contingency = (direct + overhead) * (e.contingencyPct / 100);
  const profit = (direct + overhead + contingency) * (e.profitPct / 100);
  return { bySection: [...bySection.entries()], direct, overhead, contingency, profit, total: direct + overhead + contingency + profit };
}

/* Alerts the sample people have set up, so the bell has something in it. */
export function sampleAlerts(industry: Industry): { by: string; kind: string; params: Record<string, number> }[] {
  const [owner, pm, viewer] = industry === "services" ? ["morgan.hale@brightline.example", "elena.park@brightline.example", "david.chen@brightline.example"] : ["dana.reyes@summitbuilders.example", "marcus.lee@summitbuilders.example", "priya.shah@summitbuilders.example"];
  return [
    { by: owner, kind: "weekly_summary", params: {} },
    { by: owner, kind: "job_over_budget", params: { amount: industry === "services" ? 5_000 : 25_000 } },
    { by: pm, kind: "rfi_waiting", params: { days: 21 } },
    { by: pm, kind: "job_over_budget", params: { amount: 0 } },
    { by: viewer, kind: "ar_over_60", params: { amount: industry === "services" ? 25_000 : 100_000 } },
    { by: viewer, kind: "weekly_summary", params: {} },
  ];
}
