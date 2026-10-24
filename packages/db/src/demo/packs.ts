/* One place that says what each industry's sample workspace contains. The
   demo, sandboxes, and seeding all read from here. */
import * as C from "./config";
import { CONSTRUCTION_PROFILE, type Profile } from "./construction";
import * as S from "./services-config";
import { SERVICES_PROFILE } from "./services";
import { CONSTRUCTION, SERVICES, type Industry, type Vocab } from "./vocab";

type Rows = Record<string, Record<string, unknown>[]>;
export type Member = { email: string; name: string; title: string | null; role: string; scope: string[] | null; persona?: string | null; status?: string };

export type Pack = {
  industry: Industry;
  vocab: Vocab;
  profile: Profile;
  demo: { slug: string; name: string; logoText: string };
  dashboards: { slug: string; title: string; description: string; layout: unknown }[];
  screens: { slug: string; title: string; description: string; fields: unknown[] }[];
  reportTemplates: { key: string; name: string; about: string; layout: unknown }[];
  reports: { slug: string; title: string; description: string; layout: unknown; draft: Record<string, string | undefined> }[];
  dataReports: { slug: string; title: string; description: string; category: string; definition: unknown }[];
  catalogTables: { dataset: string; name: string; title: string; description: string; grain: string; sources: string }[];
  definitions: { key: string; name: string; means: string; formula: string; sources: string; owner: string; category: string }[];
  flags: typeof C.FLAGS;
  sources: typeof C.SOURCES;
  checks: typeof C.CHECKS;
  personas: Member[];
  otherMembers: Member[];
  buildReviews: (ds: Rows, asOf: Date) => ReturnType<typeof C.buildReviews>;
  /* the screens' slugs for the field entry and the change log */
  screenSlugs: { field: string; co: string };
};

/* Definitions are shown in sections, so a team finds "cost performance" under
   Projects and "cash" under Cash, not in one long list. */
const SECTIONS: Record<string, string> = {
  actual: "Projects", budget: "Projects", earned: "Projects", cpi: "Projects", over: "Projects", pct_complete: "Projects", rfis: "Projects", change_orders: "Projects",
  crew_hours: "Hours and labor", labor_cost: "Hours and labor",
  revenue: "Profit", gross_margin: "Profit", opex: "Profit", net_income: "Profit",
  cash: "Cash", ar_outstanding: "Cash", ar_over_60: "Cash", ap_outstanding: "Cash", ap_due_7d: "Cash",
};
export const DEFINITION_SECTIONS = ["Projects", "Hours and labor", "Profit", "Cash", "Other"];
const withSections = (defs: { key: string; name: string; means: string; formula: string; sources: string; owner: string }[]) => defs.map((d) => ({ ...d, category: SECTIONS[d.key] ?? "Other" }));

const construction: Pack = {
  industry: "construction",
  vocab: CONSTRUCTION,
  profile: CONSTRUCTION_PROFILE,
  demo: { slug: "demo", name: "Summit Builders", logoText: "SB" },
  dashboards: C.DASHBOARDS,
  screens: C.SCREENS,
  reportTemplates: C.REPORT_TEMPLATES,
  reports: C.REPORTS,
  dataReports: C.DATA_REPORTS,
  catalogTables: C.CATALOG_TABLES,
  definitions: withSections(C.DEFINITIONS),
  flags: C.FLAGS,
  sources: C.SOURCES,
  checks: C.CHECKS,
  personas: C.DEMO_PERSONAS,
  otherMembers: C.DEMO_OTHER_MEMBERS.map((m) => ({ ...m, scope: null, persona: null })),
  buildReviews: C.buildReviews,
  screenSlugs: { field: "daily-field-report", co: "change-order-log" },
};

const services: Pack = {
  industry: "services",
  vocab: SERVICES,
  profile: SERVICES_PROFILE,
  demo: { slug: "services", name: "Brightline Partners", logoText: "BP" },
  dashboards: S.SERVICES_DASHBOARDS,
  screens: S.SERVICES_SCREENS,
  reportTemplates: S.SERVICES_REPORT_TEMPLATES,
  reports: S.SERVICES_REPORTS,
  dataReports: S.SERVICES_DATA_REPORTS,
  catalogTables: S.SERVICES_CATALOG_TABLES,
  definitions: withSections(S.SERVICES_DEFINITIONS),
  flags: S.SERVICES_FLAGS,
  sources: S.SERVICES_SOURCES,
  checks: S.SERVICES_CHECKS,
  personas: S.SERVICES_PERSONAS,
  otherMembers: S.SERVICES_OTHER_MEMBERS.map((m) => ({ ...m, scope: null, persona: null })),
  buildReviews: S.buildServicesReviews,
  screenSlugs: { field: "time-entry", co: "scope-change-log" },
};

export function packFor(industry: string | null | undefined): Pack {
  return industry === "services" ? services : construction;
}
export const PACKS = [construction, services];
