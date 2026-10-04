import type { TenantContext } from "@numarket/auth";

/* Navigation follows numarket's products. Each section shows what this
   person may use; a product the workspace hasn't bought stays visible but
   grayed out, with a page that explains it. */

export type NavItem = { href: string; icon: string; label: string; badge?: "flags"; locked?: boolean };
export type NavSection = { product: "foundation" | "workspace" | "insight" | "engineering"; name: string; tagline: string; owned: boolean; items: NavItem[] };

export const PRODUCT_INFO: Record<NavSection["product"], { name: string; tagline: string; about: string }> = {
  foundation: { name: "Foundation", tagline: "Your clean data", about: "Every source connected, cleaned, checked on every update, and kept in your private database, with written definitions for every number." },
  workspace: { name: "Workspace", tagline: "Dashboards, inputs, reports", about: "Dashboards that update on their own, input screens that replace spreadsheets and paper, and reports in your format." },
  insight: { name: "Insight Review", tagline: "Your analyst", about: "A numarket analyst reviews your numbers on a schedule and tells you what changed, what's at risk, and what to do next." },
  engineering: { name: "Engineering", tagline: "Built for you", about: "Custom apps, automations, and integrations built for your company alone, quoted as a project." },
};

export function navFor(ctx: TenantContext): NavSection[] {
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
  const foundation: NavItem[] = [];
  if (ctx.can("sources.view")) foundation.push({ href: "/sources", icon: "plug", label: "Sources" });
  if (ctx.can("flags.view")) foundation.push({ href: "/health", icon: "pulse", label: "Data health" }, { href: "/flags", icon: "flag", label: "Flags", badge: "flags" });
  if (ctx.can("definitions.view")) foundation.push({ href: "/definitions", icon: "book", label: "Definitions" });

  const workspace: NavItem[] = [];
  if (ctx.can("dashboard.view")) workspace.push({ href: "/dashboards", icon: "chart", label: "Dashboards" });
  if (ctx.can("input.submit")) workspace.push({ href: "/inputs", icon: "form", label: "Input screens" });
  if (ctx.can("report.view")) workspace.push({ href: "/reports", icon: "report", label: "Reports" });
  if (ctx.can("ask.use")) workspace.push({ href: "/available/ask", icon: "chat", label: "Ask Your Data", locked: true });

  const insight: NavItem[] = [];
  if (ctx.can("actions.view")) insight.push({ href: "/reviews", icon: "review", label: "Monthly reviews" });

  return [section("foundation", foundation), section("workspace", workspace), section("insight", insight), section("engineering", [])].filter((s) => !s.owned || s.items.length);
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
  if (!ctx.scope) return "All jobs";
  return ctx.scope.values.map((v) => jobNames[v] ?? `Job ${v}`).join(", ") + " only";
}
