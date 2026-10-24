/* Sample professional services firm for the second demo workspace
   (Brightline Partners): consulting and implementation projects for mid-size
   clients, billed by milestone and retainer. Same generator as construction
   (buildDatasets), different facts. All names and figures are fictional. */
import type { JobFact, Profile } from "./construction";

export const BRIGHTLINE_PROJECTS: JobFact[] = [
  { code: "201", name: "ERP Rollout", customer: "Brightwater Health System", budget: 420_000, pct: 0.58, actual: 236_000, rfis: 6, startAgo: 9 },
  { code: "204", name: "Customer Portal Rebuild", customer: "Northfield Credit Union", budget: 310_000, pct: 0.46, actual: 164_000, rfis: 11, startAgo: 7 },
  { code: "209", name: "Pricing Strategy", customer: "Cobalt Manufacturing", budget: 96_000, pct: 0.72, actual: 70_500, rfis: 2, startAgo: 4 },
  { code: "212", name: "Data Warehouse Migration", customer: "Meridian Logistics", budget: 560_000, pct: 0.31, actual: 168_000, rfis: 5, startAgo: 6 },
  { code: "216", name: "Operations Redesign", customer: "Ashford County Schools", budget: 180_000, pct: 0.24, actual: 41_000, rfis: 4, startAgo: 3 },
];

export const SERVICES_SCOPE_CAUSES = ["Client added scope", "Unclear requirements", "Estimate miss", "Rework", "Timeline change"] as const;
export const SERVICES_COST_RATE = 85;

export const SERVICES_PROFILE: Profile = {
  jobs: BRIGHTLINE_PROJECTS,
  completed: [
    { customer: "Harborline Insurance", value: 520_000, startAgo: 20, endAgo: 8 },
    { customer: "Greenfield Foods", value: 380_000, startAgo: 24, endAgo: 12 },
    { customer: "Atlas Property Partners", value: 290_000, startAgo: 16, endAgo: 5 },
    { customer: "Riverbend Medical Group", value: 610_000, startAgo: 26, endAgo: 10 },
    { customer: "Keystone Credit Union", value: 240_000, startAgo: 14, endAgo: 6 },
  ],
  otherCustomers: ["Harbor View Dental Group", "Tidewater Realty", "Summit Ridge Church", "Lumen Analytics", "Pine & Co Retail"],
  otherRevenue: [6_000, 9_000],
  otherCostShare: 0.45,
  vendors: ["Atlas Contract Staffing", "Northbeam Software", "CloudSpan Hosting", "Bright Path Recruiting", "Metro Office Partners", "SkyWay Travel", "Copperline Insurance", "Westside Print & Mail"],
  vendorScale: [1.4, 1.2, 1.1, 1.0, 0.6, 0.5, 0.45, 0.2],
  vendorSpendK: [42, 18, 12, 10, 8, 7, 5, 2],
  apBase: [52_000, 26_000, 8_000],
  apLate: [
    { i: 0, bucket: 3, amount: 6_400 },
    { i: 5, bucket: 4, amount: 1_900 },
  ],
  arLate: [
    { job: "204", bucket: 3, amount: 58_600 }, // Northfield Credit Union pays slowly
    { job: "216", bucket: 4, amount: 12_400 },
    { customer: "Tidewater Realty", bucket: 3, amount: 5_200 },
  ],
  causes: SERVICES_SCOPE_CAUSES,
  heavy: { job: "204", causeIdx: 1, factor: 3.2 }, // unclear requirements drive the portal rebuild
  coShare: [0.05, 0.04],
  laborRate: SERVICES_COST_RATE,
  markup: 1.85,
  hoursShare: 0.88,
  dailyHours: [8, 26],
  revenueAccounts: ["Project fees", "Retainers and advisory"],
  cogsParts: [
    ["Consultant salaries", 0.62, 0.05],
    ["Project software", 0.05, 0.02],
    ["Travel", 0.04, 0.02],
  ],
  cogsRemainder: "Contractors",
  cogsOrder: ["Consultant salaries", "Contractors", "Project software", "Travel"],
  opex: [
    ["Office and admin salaries", 38_000],
    ["Rent and office", 11_000],
    ["Insurance", 4_200],
    ["Marketing and business development", 7_500],
    ["Software and IT", 6_800],
    ["Other general and admin", 5_900],
  ],
  cashStart: 520_000,
  cashNoise: 30_000,
  rfi: {
    prefix: "REQ",
    start: 310,
    subjects: ["Access to the finance system", "Sign-off on requirements", "Test environment logins", "Interview times with managers", "Approval of a scope change", "Sample files for the migration", "Brand guidelines", "Security questionnaire answers"],
    ballInCourt: ["Client IT", "Client sponsor", "Client finance", "Client legal"],
  },
  screens: { field: "time-entry", co: "scope-change-log" },
  sample: { people: ["Nina Brooks", "Theo Grant", "Ana Silva"], notes: ["Workshop with the finance team", "Waiting on REQ 312 (data access)", "Demo to the sponsor on Thursday", "Requirements signed off"], base: 7, step: 3 },
};
