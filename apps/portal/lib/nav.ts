import type { TenantContext } from "@numarket/auth";

/* Navigation = products the tenant bought × what this user may do (Spec §12). */
export type NavItem = { href: string; icon: string; label: string; badge?: "flags" };

export function navFor(ctx: TenantContext) {
  const has = (p: string) => ctx.tenant.products.includes(p);
  const groups: { name: string; items: NavItem[] }[] = [];
  const work: NavItem[] = [{ href: "/", icon: "home", label: "Home" }];
  if (has("workspace")) {
    if (ctx.can("dashboard.view")) work.push({ href: "/dashboards", icon: "chart", label: "Dashboards" });
    if (ctx.can("input.submit")) work.push({ href: "/inputs", icon: "form", label: "Input screens" });
    if (ctx.can("report.view")) work.push({ href: "/reports", icon: "report", label: "Reports" });
  }
  groups.push({ name: "Workspace", items: work });
  if (has("foundation")) {
    const data: NavItem[] = [];
    if (ctx.can("sources.view")) data.push({ href: "/sources", icon: "plug", label: "Sources" });
    if (ctx.can("flags.view")) data.push({ href: "/health", icon: "pulse", label: "Data health" }, { href: "/flags", icon: "flag", label: "Flags", badge: "flags" });
    if (ctx.can("definitions.view")) data.push({ href: "/definitions", icon: "book", label: "Definitions" });
    if (data.length) groups.push({ name: "Your data", items: data });
  }
  const admin: NavItem[] = [];
  if (ctx.can("users.manage")) admin.push({ href: "/admin/users", icon: "users", label: "Users" }, { href: "/admin/roles", icon: "key", label: "Roles" });
  if (ctx.can("users.manage")) admin.push({ href: "/admin/security", icon: "shield", label: "Security" });
  if (ctx.can("branding.manage")) admin.push({ href: "/admin/branding", icon: "palette", label: "Branding" });
  if (ctx.can("audit.view")) admin.push({ href: "/admin/audit", icon: "list", label: "Audit log" });
  if (ctx.can("usage.view")) admin.push({ href: "/admin/usage", icon: "gauge", label: "Usage & plan" });
  if (admin.length) groups.push({ name: "Admin", items: admin });
  return groups;
}

export const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", editor: "Editor", contributor: "Contributor", viewer: "Viewer" };

export function scopeLabel(ctx: TenantContext, jobNames: Record<string, string>) {
  if (!ctx.scope) return "All jobs";
  return ctx.scope.values.map((v) => jobNames[v] ?? `Job ${v}`).join(", ") + " only";
}
