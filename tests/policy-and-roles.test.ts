/* Security policy, roles, scopes, and lockout protection (Spec §4.3, §6). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closePool, withProvisioner, withTenant } from "../packages/db/src/client";
import { updateMember } from "../packages/db/src/repo/admin";
import { scopeRows } from "../packages/db/src/repo/snapshots";
import { validateEntry, type FieldDef } from "../packages/db/src/repo/workspace";
import { authenticateTenant, tenantBySlug, type Tenant } from "../packages/auth/src/context";
import { hostConfigFromEnv } from "../packages/auth/src/hosts";
import { can, PERMISSIONS } from "../packages/auth/src/permissions";
import { evaluatePolicy, ipAllowed, ipInCidr, type SecurityPolicy } from "../packages/auth/src/policy";
import { startDevTenantSession } from "../packages/auth/src/providers";

let acme: Tenant;
beforeAll(async () => {
  acme = (await tenantBySlug("acme"))!;
});
afterAll(() => closePool());

describe("IP allowlists", () => {
  it("matches IPv4 and IPv6 ranges", () => {
    expect(ipInCidr("10.1.2.3", "10.0.0.0/8")).toBe(true);
    expect(ipInCidr("11.1.2.3", "10.0.0.0/8")).toBe(false);
    expect(ipInCidr("203.0.113.7", "203.0.113.7")).toBe(true);
    expect(ipInCidr("::ffff:192.168.1.5", "192.168.1.0/24")).toBe(true);
    expect(ipInCidr("2001:db8::1", "2001:db8::/32")).toBe(true);
    expect(ipInCidr("2001:db9::1", "2001:db8::/32")).toBe(false);
    expect(ipAllowed(null, ["0.0.0.0/0"])).toBe(false);
  });

  it("blocks a request from outside the allowlist, end to end", async () => {
    await withProvisioner((db) => db.query("update security_policies set ip_allowlist = '{198.51.100.0/24}'"), { tenantId: acme.id });
    try {
      const { token } = await startDevTenantSession(acme, "owner@acme.example", { ip: "198.51.100.20", userAgent: "t" });
      const cfg = hostConfigFromEnv();
      const inside = await authenticateTenant({ host: "acme.localhost:3100", token, ip: "198.51.100.20", cfg });
      const outside = await authenticateTenant({ host: "acme.localhost:3100", token, ip: "203.0.113.9", cfg });
      expect(inside.kind).toBe("ok");
      expect(outside).toMatchObject({ kind: "blocked", reason: "network" });
    } finally {
      await withProvisioner((db) => db.query("update security_policies set ip_allowlist = '{}'"), { tenantId: acme.id });
    }
  });
});

describe("session rules", () => {
  const policy: SecurityPolicy = { allowedMethods: ["microsoft", "password"], requireMfa: true, allowedEmailDomains: [], ipAllowlist: [], sessionHours: 12, idleMinutes: 60, exportRoles: [], requireApproval: false };
  const now = new Date("2026-10-04T15:00:00Z");
  const fresh = { createdAt: new Date(now.getTime() - 3600_000), lastSeenAt: new Date(now.getTime() - 60_000) };

  it("refuses methods the tenant has not allowed", () => {
    expect(evaluatePolicy(policy, { method: "google", mfa: false, ...fresh }, "1.1.1.1", now)).toEqual({ ok: false, reason: "method" });
  });
  it("requires MFA for email and password sign-in", () => {
    expect(evaluatePolicy(policy, { method: "password", mfa: false, ...fresh }, "1.1.1.1", now)).toEqual({ ok: false, reason: "mfa" });
    expect(evaluatePolicy(policy, { method: "password", mfa: true, ...fresh }, "1.1.1.1", now)).toEqual({ ok: true });
  });
  it("ends idle and expired sessions", () => {
    expect(evaluatePolicy(policy, { method: "microsoft", mfa: false, createdAt: fresh.createdAt, lastSeenAt: new Date(now.getTime() - 61 * 60_000) }, null, now)).toEqual({ ok: false, reason: "idle" });
    expect(evaluatePolicy(policy, { method: "microsoft", mfa: false, createdAt: new Date(now.getTime() - 13 * 3600_000), lastSeenAt: fresh.lastSeenAt }, null, now)).toEqual({ ok: false, reason: "expired" });
  });
});

describe("roles", () => {
  it("only Owners manage the security policy", () => {
    expect(can("owner", "security.manage")).toBe(true);
    for (const r of ["admin", "editor", "contributor", "viewer"] as const) expect(can(r, "security.manage")).toBe(false);
  });
  it("Viewers and Contributors have no admin permissions", () => {
    const admin = ["users.manage", "roles.manage", "branding.manage", "audit.view", "usage.view", "sources.connect", "refresh.trigger"] as const;
    for (const p of admin) {
      expect(can("viewer", p)).toBe(false);
      expect(can("contributor", p)).toBe(false);
    }
  });
  it("data plumbing is for admins and owners; viewers read and ask", () => {
    for (const r of ["editor", "contributor", "viewer"] as const) expect(can(r, "sources.view")).toBe(false);
    expect(can("viewer", "flags.view")).toBe(false);
    expect(can("editor", "flags.view")).toBe(true);
    expect(can("viewer", "ask.use")).toBe(true);
    expect(can("admin", "sources.view")).toBe(true);
  });
  it("Contributors can only enter data", () => {
    expect(PERMISSIONS.filter((p) => can("contributor", p))).toEqual(["input.submit", "input.edit_own", "definitions.view"]);
  });
  it("Owners have every permission", () => {
    expect(PERMISSIONS.every((p) => can("owner", p))).toBe(true);
  });
});

describe("data scopes", () => {
  const rows = [{ job: "114", v: 1 }, { job: "121", v: 2 }, { job: "108", v: 3 }];
  it("limits rows to the user's scope", () => {
    expect(scopeRows(rows, { dimension: "job", values: ["114"] })).toEqual([{ job: "114", v: 1 }]);
    expect(scopeRows(rows, null)).toHaveLength(3);
  });
  it("hides datasets that cannot be scoped (fails closed)", () => {
    expect(scopeRows([{ month: "2026-09", v: 1 }], { dimension: "job", values: ["114"] })).toEqual([]);
  });
});

describe("input validation", () => {
  const fields: FieldDef[] = [
    { key: "job", label: "Job", type: "select", options: "jobs", required: true },
    { key: "date", label: "Date", type: "date", required: true, minDaysAgo: 14 },
    { key: "crew_hours", label: "Crew hours", type: "number", required: true, min: 0.5, max: 400 },
    { key: "note", label: "Note", type: "text", maxLength: 10 },
  ];
  const ctx = { jobs: ["114"], today: "2026-10-04" };
  it("accepts a valid entry", () => {
    expect(validateEntry(fields, { job: "114", date: "2026-10-03", crew_hours: "40" }, ctx)).toMatchObject({ ok: true, data: { job: "114", crew_hours: 40 } });
  });
  it("rejects jobs outside the user's scope, future dates, and out-of-range numbers", () => {
    const r = validateEntry(fields, { job: "121", date: "2026-10-09", crew_hours: "9000", note: "far too long a note" }, ctx);
    expect(Object.keys(r.errors).sort()).toEqual(["crew_hours", "date", "job", "note"]);
  });
});

describe("lockout protection", () => {
  it("never removes the last Owner", async () => {
    const ownerId = await withTenant(acme.id, async (db) => (await db.query<{ user_id: string }>("select user_id from memberships where role = 'owner'")).rows[0].user_id);
    await expect(withTenant(acme.id, (db) => updateMember(db, ownerId, { role: "viewer" }))).rejects.toThrow(/at least one Owner/);
    await expect(withTenant(acme.id, (db) => updateMember(db, ownerId, { status: "deactivated" }))).rejects.toThrow(/at least one Owner/);
  });
});
