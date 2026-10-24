import type { TenantContext } from "@numarket/auth";
import { vocabFor } from "@numarket/db/demo/vocab";

/* Navigation follows numarket's products, kept short: each product has one or
   two entries, and each entry opens a hub with tabs. People see only what
   their role uses; a product the workspace hasn't bought stays visible but
   grayed out, with a page that explains it. */

export type NavItem = { href: string; icon: string; label: string; badge?: "flags"; locked?: boolean; match?: string[] };
export type NavSection = { product: "foundation" | "workspace" | "insight" | "engineering"; name: string; tagline: string; owned: boolean; items: NavItem[] };

export const PRODUCT_INFO: Record<NavSection["product"], { name: string; tagline: string; about: string }> = {
  foundation: { name: "Foundation", tagline: "Your clean data", about: "Every source connected, cleaned, checked on every update, and kept in your private database, with written definitions for every number." },
  workspace: { name: "Workspace", tagline: "The software your team uses", about: "Dashboards that update on their own, status reports in your branding, input screens that replace spreadsheets and paper, and Ask Your Data." },
  insight: { name: "Insight Review", tagline: "Your analyst", about: "A named numarket analyst reviews your numbers on a schedule, explains what changed and why, tracks action items to done, and prepares your QBR and board packs." },
  engineering: { name: "Engineering", tagline: "Apps built for you", about: "Custom apps and automations built for your company alone (estimating, approvals, paper-to-digital intake, write-backs to your systems), quoted as a project." },
};

const DATA_PATHS = ["/health", "/flags", "/sources", "/data", "/upload", "/definitions"];

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
      owned,
      items: owned ? items : [{ href: `/available/${product}`, icon: "lock", label: "Not in your plan", locked: true }],
    };
  };

  /* Foundation: one hub for the data. People who don't manage data see only
     what they use from it (definitions, uploads). */
  const foundation: NavItem[] = [];
  const dataHome = hubTabs("data", ctx)[0];
  if (ctx.can("sources.view") || ctx.can("flags.view")) foundation.push({ href: dataHome.href, icon: "database", label: "Your data", badge: ctx.can("flags.view") ? "flags" : undefined, match: DATA_PATHS });
  else {
    if (ctx.can("input.submit")) foundation.push({ href: "/upload", icon: "upload", label: "Upload files" });
    if (ctx.can("definitions.view")) foundation.push({ href: "/definitions", icon: "book", label: "Definitions" });
  }

  const workspace: NavItem[] = [];
  if (ctx.can("dashboard.view")) workspace.push({ href: "/dashboards", icon: "chart", label: "Dashboards" });
  if (ctx.can("report.view")) workspace.push({ href: "/reports", icon: "report", label: "Reports", match: ["/reports", "/run"] });
  if (ctx.can("input.submit")) workspace.push({ href: "/inputs", icon: "form", label: "Input screens", match: ["/inputs"] });
  if (ctx.can("ask.use")) workspace.push({ href: "/ask", icon: "chat", label: "Ask Your Data" });

  const insight: NavItem[] = [];
  if (ctx.can("actions.view")) insight.push({ href: "/reviews", icon: "review", label: "Your analyst", match: ["/reviews"] });

  const engineering: NavItem[] = [{ href: "/apps", icon: "grid", label: "Apps", match: ["/apps"] }];

  return [section("foundation", foundation), section("workspace", workspace), section("insight", insight), section("engineering", engineering)].filter((s) => !s.owned || s.items.length);
}

/* The tabs inside each hub, filtered by role. */
export type HubTab = { href: string; label: string; badge?: "flags" };
export function hubTabs(hub: "data" | "reports" | "analyst", ctx: TenantContext): HubTab[] {
  const tabs: (HubTab & { ok: boolean })[] =
    hub === "data"
      ? [
          { href: "/health", label: "Health", ok: ctx.can("flags.view") },
          { href: "/flags", label: "Flags", badge: "flags", ok: ctx.can("flags.view") },
          { href: "/sources", label: "Sources", ok: ctx.can("sources.view") },
          { href: "/data", label: "Tables", ok: ctx.can("sources.view") },
          { href: "/upload", label: "Upload", ok: ctx.can("input.submit") },
          { href: "/definitions", label: "Definitions", ok: ctx.can("definitions.view") },
        ]
      : hub === "reports"
        ? [
            { href: "/reports", label: "Status reports", ok: ctx.can("report.view") },
            { href: "/run", label: "Run a report", ok: ctx.can("dashboard.view") },
          ]
        : [
            { href: "/reviews", label: "Overview", ok: ctx.can("actions.view") },
            { href: "/reviews/actions", label: "Action items", ok: ctx.can("actions.view") },
            { href: "/reviews/qbr", label: "QBR pack", ok: ctx.can("actions.view") && ctx.can("dashboard.view") },
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
