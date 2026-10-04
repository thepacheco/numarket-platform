/* Permission keys and the built-in client roles (Platform Build Spec §6).
   A role is a bundle of keys. Every check happens on the server; the UI hiding
   something is never the control. */

export const PERMISSIONS = [
  "dashboard.view",
  "dashboard.export",
  "report.view",
  "report.edit",
  "report.publish",
  "report.schedule",
  "input.submit",
  "input.edit_own",
  "input.edit_any",
  "input.approve",
  "alert.manage_own",
  "alert.manage_all",
  "ask.use",
  "definitions.view",
  "definitions.suggest",
  "flags.view",
  "flags.resolve",
  "sources.view",
  "sources.connect",
  "refresh.trigger",
  "actions.view",
  "actions.update_own",
  "actions.manage",
  "users.manage",
  "roles.manage",
  "branding.manage",
  "security.manage",
  "audit.view",
  "usage.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type Role = "owner" | "admin" | "editor" | "contributor" | "viewer";

const viewer: Permission[] = ["dashboard.view", "report.view", "definitions.view", "flags.view", "sources.view", "actions.view"];
const contributor: Permission[] = ["input.submit", "input.edit_own", "definitions.view"];
const editor: Permission[] = [
  ...viewer,
  ...contributor,
  "dashboard.export",
  "report.edit",
  "report.publish",
  "alert.manage_own",
  "ask.use",
  "definitions.suggest",
  "flags.resolve",
  "actions.update_own",
];
const admin: Permission[] = PERMISSIONS.filter((p) => p !== "security.manage");
const owner: Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  owner: new Set(owner),
  admin: new Set(admin),
  editor: new Set(editor),
  contributor: new Set(contributor),
  viewer: new Set(viewer),
};

export const ROLES: { id: Role; name: string; summary: string }[] = [
  { id: "owner", name: "Owner", summary: "Everything an Admin can do, plus the security policy, billing contact, and full data export." },
  { id: "admin", name: "Admin", summary: "Users and roles, branding, alerts, report schedules, source connections, audit log, and usage." },
  { id: "editor", name: "Editor", summary: "Enter data, edit and publish reports, resolve data flags, and manage their own alerts." },
  { id: "contributor", name: "Contributor", summary: "Enter data in input screens. Nothing else." },
  { id: "viewer", name: "Viewer", summary: "View dashboards and reports within their data scope." },
];

export function isRole(r: string): r is Role {
  return r in ROLE_PERMISSIONS;
}

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/* Grouped for the Roles page. */
export const PERMISSION_GROUPS: { name: string; keys: Permission[] }[] = [
  { name: "Dashboards", keys: ["dashboard.view", "dashboard.export"] },
  { name: "Reports", keys: ["report.view", "report.edit", "report.publish", "report.schedule"] },
  { name: "Input screens", keys: ["input.submit", "input.edit_own", "input.edit_any", "input.approve"] },
  { name: "Alerts", keys: ["alert.manage_own", "alert.manage_all"] },
  { name: "Ask Your Data", keys: ["ask.use"] },
  { name: "Your data", keys: ["definitions.view", "definitions.suggest", "flags.view", "flags.resolve", "sources.view", "sources.connect", "refresh.trigger"] },
  { name: "Insight Review", keys: ["actions.view", "actions.update_own", "actions.manage"] },
  { name: "Administration", keys: ["users.manage", "roles.manage", "branding.manage", "security.manage", "audit.view", "usage.view"] },
];
