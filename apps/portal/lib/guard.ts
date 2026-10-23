import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { authenticateStaff, authenticateTenant, SESSION_COOKIE, tenantForHost, type Permission, type StaffContext, type TenantContext } from "@numarket/auth";
import { cookieValue, hostCfg, requestMeta } from "./request";

/* The data-access gate. Every tenant page, server action, and route handler
   calls requireTenant() (or requireStaff() on the ops console) before reading
   or changing anything. Layouts only use it for display: Next.js does not
   re-run layouts on navigation, so they are never the control.
   tests/guards.test.ts fails if a page or action skips it. */

const authenticate = cache(async () => {
  const meta = await requestMeta();
  const token = await cookieValue(SESSION_COOKIE.tenant);
  return { meta, auth: await authenticateTenant({ host: meta.host, token, ip: meta.ip, cfg: hostCfg }) };
});

export async function requireTenant(permission?: Permission): Promise<TenantContext> {
  const { auth } = await authenticate();
  if (auth.kind === "no-tenant") notFound();
  if (auth.kind === "signed-out") redirect("/sign-in");
  if (auth.kind === "blocked") redirect(`/blocked?reason=${auth.reason}`);
  if (permission && !auth.ctx.can(permission)) notFound();
  return auth.ctx;
}

/** For the sign-in and blocked pages: the tenant behind this host, signed in or not. */
export const tenantForRequest = cache(async () => {
  const meta = await requestMeta();
  return tenantForHost(meta.host, hostCfg);
});

/** Throws instead of redirecting, for server actions that return a message. */
export async function tenantOrThrow(permission: Permission) {
  const { auth, meta } = await authenticate();
  if (auth.kind !== "ok") throw new ActionError("Your session ended. Sign in again.");
  if (!auth.ctx.can(permission)) throw new ActionError("You don't have permission to do that.");
  return { ctx: auth.ctx, meta };
}

export class ActionError extends Error {}

const staffAuth = cache(async () => authenticateStaff(await cookieValue(SESSION_COOKIE.ops)));

export async function requireStaff(): Promise<StaffContext> {
  const s = await staffAuth();
  if (!s) redirect("/ops/sign-in");
  return s;
}

export async function staffOrThrow(roles?: string[]) {
  const s = await staffAuth();
  if (!s) throw new ActionError("Your session ended. Sign in again.");
  if (roles && !roles.includes(s.platformRole)) throw new ActionError("You don't have permission to do that.");
  return { staff: s, meta: await requestMeta() };
}

/* Demo workspaces are shared by every visitor, so settings stay fixed. */
export function assertNotDemo(ctx: TenantContext) {
  if (ctx.tenant.isDemo) throw new ActionError("Settings are view-only in the demo and in sandboxes. Everything else works.");
}
