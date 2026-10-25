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
  "requests.view",
  "requests.submit",
  "requests.approve",
  "users.manage",
  "roles.manage",
  "branding.manage",
  "security.manage",
  "audit.view",
  "usage.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type Role = "owner" | "admin" | "editor" | "contributor" | "viewer";

/* People see what their job needs. Viewers read the numbers, ask
   questions, and set their own alerts; data plumbing (sources, tables) is
   for admins and owners; flags go to the people who can answer them. */
const viewer: Permission[] = ["dashboard.view", "report.view", "definitions.view", "actions.view", "ask.use", "alert.manage_own", "requests.view", "requests.submit"];
const contributor: Permission[] = ["input.submit", "input.edit_own", "definitions.view"];
const editor: Permission[] = [
  ...viewer,
  ...contributor,
  "flags.view",
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
  { id: "editor", name: "Editor", summary: "Enter data, edit and publish reports, answer data flags, and manage their own alerts." },
  { id: "contributor", name: "Contributor", summary: "Fill in forms, like the daily log or timesheets. Nothing else." },
  { id: "viewer", name: "Viewer", summary: "Read dashboards, reports, and reviews, ask questions, and set their own alerts, within their data scope." },
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
  { name: "Forms", keys: ["input.submit", "input.edit_own", "input.edit_any", "input.approve"] },
  { name: "Alerts", keys: ["alert.manage_own", "alert.manage_all"] },
  { name: "Ask Your Data", keys: ["ask.use"] },
  { name: "Your data", keys: ["definitions.view", "definitions.suggest", "flags.view", "flags.resolve", "sources.view", "sources.connect", "refresh.trigger"] },
  { name: "Insight Review", keys: ["actions.view", "actions.update_own", "actions.manage"] },
  { name: "Requests to numarket", keys: ["requests.view", "requests.submit", "requests.approve"] },
  { name: "Administration", keys: ["users.manage", "roles.manage", "branding.manage", "security.manage", "audit.view", "usage.view"] },
];
