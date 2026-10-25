import type { TenantContext } from "@numarket/auth";
import { vocabFor } from "@numarket/db/demo/vocab";

/* Navigation follows numarket's products, and each product answers one
   question. Foundation is your data: look through it, add to it, and trust
   it. Workspace is what's built on it: dashboards, reports, Ask. Insight
   Review is your analyst; Engineering is apps made for you. Each entry opens
   a hub with tabs; people see only what their role uses, and a product the
   workspace hasn't bought stays visible, grayed out, with a page explaining it. */

export type NavItem = { href: string; icon: string; label: string; tip?: string; badge?: "flags"; locked?: boolean; match?: string[] };
export type NavSection = { product: "foundation" | "workspace" | "insight" | "engineering"; name: string; tagline: string; short: string; about: string; owned: boolean; items: NavItem[] };

export const PRODUCT_INFO: Record<NavSection["product"], { name: string; tagline: string; short: string; about: string }> = {
  foundation: { name: "Foundation", tagline: "Your data", short: "Look through it, add to it, get alerts on it, and check you can trust it.", about: "Every system's data connected, cleaned, checked on every update, and kept in your private database. Look through it, filter it, download it, set alerts on it, and add what isn't in any system." },
  workspace: { name: "Workspace", tagline: "Your dashboards and reports", short: "What numarket builds on your data for your team to use.", about: "What numarket builds on your data: dashboards that update on their own, status reports in your branding, and Ask Your Data." },
  insight: { name: "Insight Review", tagline: "Your analyst", short: "Why the numbers moved, what to do about it, and follow-through.", about: "A named numarket analyst reviews your numbers on a schedule, explains what changed and why, tracks action items to done, and prepares your QBR and board packs." },
  engineering: { name: "Engineering", tagline: "Apps built for you", short: "Tools made for how your company works.", about: "Custom apps and automations built for your company alone (estimating, approvals, paper-to-digital intake, write-backs to your systems), quoted as a project." },
};

const HEALTH_PATHS = ["/health", "/flags", "/sources", "/definitions"];

export function navFor(ctx: TenantContext): NavSection[] {
  const v = vocabFor(ctx.tenant.industry);
  const has = (p: string) => ctx.tenant.products.includes(p);
  const section = (product: NavSection["product"], items: NavItem[]): NavSection => {
    const info = PRODUCT_INFO[product];
    const owned = has(product);
    return {
      product,
      name: info.name,
      tagline: info.tagline,
      short: info.short,
      about: info.about,
      owned,
      items: owned ? items : [{ href: `/available/${product}`, icon: "lock", label: "Not in your plan", tip: `${info.about} See what it adds.`, locked: true }],
    };
  };

  /* Foundation: your data. Look through it (and get alerts), add to it, trust it. */
  const foundation: NavItem[] = [];
  if (ctx.can("dashboard.view")) foundation.push({ href: "/explore", icon: "search", label: "Explore", tip: "Look through any of your data: filter it, find things, save the view, download it, and ask to be told when something changes.", match: ["/explore", "/data", "/alerts"] });
  if (ctx.can("input.submit")) foundation.push({ href: "/inputs", icon: "form", label: "Enter data", tip: `For what isn't in any system yet, like ${v.industry === "services" ? "timesheets" : "the superintendent's daily log"}: fill in a form or upload the spreadsheet. It becomes part of your data at the next update.`, match: ["/inputs", "/upload"] });
  if (ctx.can("flags.view") || ctx.can("sources.view")) foundation.push({ href: hubTabs("health", ctx)[0].href, icon: "pulse", label: "Data health", tip: "Can you trust the numbers? Every system's connection, the checks on each update, questions about your data to answer (flags), and what every number means.", badge: ctx.can("flags.view") ? "flags" : undefined, match: HEALTH_PATHS });
  else if (ctx.can("definitions.view")) foundation.push({ href: "/definitions", icon: "book", label: "Definitions", tip: "What every number means, how it's calculated, and which system it comes from." });

  /* Workspace: what's built on the data. */
  const workspace: NavItem[] = [];
  if (ctx.can("dashboard.view")) workspace.push({ href: "/dashboards", icon: "chart", label: "Dashboards", tip: "Charts of your business, built for you by numarket, that update on their own. Filter them, pin to Home, copy a chart, ask about them." });
  if (ctx.can("report.view")) workspace.push({ href: "/reports", icon: "report", label: "Reports", tip: "Status reports in your branding: the numbers fill in; your team adds the commentary; publish and download as PDF.", match: ["/reports"] });
  if (ctx.can("ask.use")) workspace.push({ href: "/ask", icon: "chat", label: "Ask Your Data", tip: "Ask a question in plain words. The answer comes from your own numbers and shows where it came from." });

  const insight: NavItem[] = [];
  if (ctx.can("actions.view")) insight.push({ href: "/reviews", icon: "review", label: "Your analyst", tip: "Your numarket analyst's reviews: what changed and why, action items tracked to done, and the quarterly (QBR) pack.", match: ["/reviews"] });

  const engineering: NavItem[] = [{ href: "/apps", icon: "grid", label: "Apps", tip: `Apps built for your company alone: scan paper forms, build estimates, approve ${v.changeOrders}.`, match: ["/apps"] }];

  return [section("foundation", foundation), section("workspace", workspace), section("insight", insight), section("engineering", engineering)].filter((s) => !s.owned || s.items.length);
}

/* The tabs inside each hub, filtered by role. */
export type Hub = "explore" | "enter" | "health" | "analyst";
export type HubTab = { href: string; label: string; badge?: "flags" };
export function hubTabs(hub: Hub, ctx: TenantContext): HubTab[] {
  const tabs: (HubTab & { ok: boolean })[] =
    hub === "explore"
      ? [
          { href: "/explore", label: "Explore", ok: ctx.can("dashboard.view") },
          { href: "/alerts", label: "Alerts", ok: ctx.can("alert.manage_own") },
          { href: "/data", label: "All tables", ok: ctx.can("sources.view") },
        ]
      : hub === "enter"
        ? [
            { href: "/inputs", label: "Forms", ok: ctx.can("input.submit") },
            { href: "/upload", label: "Upload a spreadsheet", ok: ctx.can("input.submit") },
          ]
        : hub === "health"
          ? [
              { href: "/health", label: "Health", ok: ctx.can("flags.view") },
              { href: "/flags", label: "Flags", badge: "flags", ok: ctx.can("flags.view") },
              { href: "/sources", label: "Sources", ok: ctx.can("sources.view") },
              { href: "/definitions", label: "Definitions", ok: ctx.can("definitions.view") },
            ]
          : [
              { href: "/reviews", label: "Overview", ok: ctx.can("actions.view") },
              { href: "/reviews/actions", label: "Action items", ok: ctx.can("actions.view") },
              { href: "/reviews/questions", label: "Questions", ok: ctx.can("requests.view") && ctx.tenant.products.includes("insight") },
              { href: "/reviews/qbr", label: "QBR pack", ok: ctx.can("actions.view") && ctx.can("dashboard.view") && !ctx.scope },
            ];
  const out = tabs.filter((t) => t.ok).map(({ ok: _ok, ...t }) => t);
  return out.length ? out : [{ href: "/definitions", label: "Definitions" }];
}

export function canSeeSettings(ctx: TenantContext) {
  return ctx.can("users.manage") || ctx.can("branding.manage") || ctx.can("audit.view") || ctx.can("usage.view");
}

export function settingsLinks(ctx: TenantContext) {
  const out: { href: string; label: string }[] = [];
  if (ctx.can("users.manage")) out.push({ href: "/admin/users", label: "Users" }, { href: "/admin/roles", label: "Roles" }, { href: "/admin/security", label: "Security" });
  if (ctx.can("branding.manage")) out.push({ href: "/admin/branding", label: "Branding" });
  if (ctx.can("audit.view")) out.push({ href: "/admin/audit", label: "Audit log" });
  if (ctx.can("usage.view")) out.push({ href: "/admin/usage", label: "Usage & plan" });
  return out;
}

export const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", editor: "Editor", contributor: "Contributor", viewer: "Viewer" };

export function scopeLabel(ctx: TenantContext, jobNames: Record<string, string>) {
  const v = vocabFor(ctx.tenant.industry);
  if (!ctx.scope) return `All ${v.jobs}`;
  return ctx.scope.values.map((x) => jobNames[x] ?? `${v.Job} ${x}`).join(", ") + " only";
}
