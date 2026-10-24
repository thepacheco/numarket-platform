import type { Industry, Vocab } from "@numarket/db/demo/vocab";

/* Engineering apps: small tools built for one company, on the same data and
   sign-in as the rest of the workspace. The three here are examples every
   sample workspace has; a real workspace gets the ones its Engineering
   project builds. */

export type AppInfo = { slug: string; icon: string; name: string; what: string; replaces: string; who: string };

export function appsFor(industry: Industry, v: Vocab): AppInfo[] {
  const services = industry === "services";
  return [
    {
      slug: "paper-intake",
      icon: "scan",
      name: services ? "Scan a timesheet" : "Scan a paper form",
      what: services
        ? "Take a photo of a paper timesheet. The app reads it, you check what it read, and it's saved as a time entry."
        : "Take a photo of a paper daily log. The app reads it, you check what it read, and it's saved as a daily field report.",
      replaces: services ? "Typing paper timesheets into a spreadsheet" : "Retyping paper daily logs at the office",
      who: services ? "Consultants and the office" : "Superintendents and the office",
    },
    {
      slug: "estimates",
      icon: "dollar",
      name: services ? "Proposal builder" : "Estimate builder",
      what: services
        ? "Price a proposal from roles, hours, and rates, with your past projects' actual hours beside it."
        : `Price a bid from labor, materials, and subs, with your past ${v.jobs}' actual cost performance beside it.`,
      replaces: services ? "The proposal pricing spreadsheet" : "The estimating spreadsheet",
      who: services ? "Partners and project managers" : "Estimators and owners",
    },
    {
      slug: "approvals",
      icon: "check",
      name: `${v.ChangeOrder} approvals`,
      what: `Request a ${v.changeOrder} from the ${services ? "project" : "field"}; an owner or admin approves it on any device. Approved ones go into the ${v.changeOrder} log automatically.`,
      replaces: `${v.ChangeOrders} approved by email and forgotten`,
      who: "Project managers request; owners approve",
    },
  ];
}
