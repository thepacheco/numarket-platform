/* Prospect sandboxes: private, code-gated copies of the demo that close on time. */
import { afterAll, describe, expect, it } from "vitest";
import { closePool, withPlatform, withProvisioner, withTenant } from "../packages/db/src/client";
import { tenantBySlug, tenantForHost } from "../packages/auth/src/context";
import { hostConfigFromEnv } from "../packages/auth/src/hosts";
import { startDemoSession } from "../packages/auth/src/providers";
import { createSandbox, deleteExpiredSandboxes, deleteSandbox, extendSandbox, listSandboxes, sandboxCodeOk, sandboxSlugFrom, sandboxSlugProblem } from "../packages/auth/src/sandbox";

const cfg = () => hostConfigFromEnv();
const req = { ip: "203.0.113.10", userAgent: "vitest" };
afterAll(() => closePool());

describe("sandbox names", () => {
  it("makes a clean short name and refuses reserved or taken ones", async () => {
    expect(sandboxSlugFrom("Halden & Sons Construction, LLC")).toBe("halden-and-sons-construction-l");
    expect(sandboxSlugProblem("demo")).toMatch(/reserved/);
    expect(sandboxSlugProblem("a")).toMatch(/3–30/);
    await expect(createSandbox({ name: "Summit", slug: "acme" })).rejects.toThrow(/reserved/);
    await expect(createSandbox({ name: "Somebody", days: 45 })).rejects.toThrow(/between 1 and 30/);
  });
});

describe("a sandbox", () => {
  it("opens at its own address, only with its code, with the prospect's name", async () => {
    const s = await createSandbox({ name: "Ridgeway Builders", days: 14, color: "#1F4E79" });
    expect(s.slug).toBe("ridgeway-builders");
    expect(s.code).toMatch(/^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    const t = (await tenantForHost("ridgeway-builders.localhost:3100", cfg()))!;
    expect(t).toMatchObject({ name: "Ridgeway Builders", isDemo: true });
    expect(t.sandboxUntil!.getTime()).toBeGreaterThan(Date.now() + 13 * 86_400_000);

    // the code is required, checked exactly, and wrong codes fail
    await expect(startDemoSession(t, "owner", req)).rejects.toThrow(/access code/);
    await expect(startDemoSession(t, "owner", req, { sandboxCode: "AAAA-BBBB-CCCC" })).rejects.toThrow(/access code/);
    expect(await sandboxCodeOk(t.id, s.code.toLowerCase().replace(/-/g, " "))).toBe(true);
    const session = await startDemoSession(t, "owner", req, { sandboxCode: s.code });
    expect(session.token).toBeTruthy();

    // its own data and branding, walled off from the public demo
    const demo = (await tenantBySlug("demo"))!;
    const brand = await withTenant(t.id, async (db) => (await db.query<{ display_name: string; primary_color: string }>("select display_name, primary_color from branding")).rows[0]);
    expect(brand).toEqual({ display_name: "Ridgeway Builders", primary_color: "#1F4E79" });
    const crossRead = await withTenant(demo.id, async (db) => (await db.query("select 1 from branding where tenant_id = $1", [t.id])).rowCount);
    expect(crossRead).toBe(0);
    expect((await listSandboxes()).map((x) => x.slug)).toContain("ridgeway-builders");

    // a second sandbox can't take the same name
    await expect(createSandbox({ name: "Ridgeway Builders" })).rejects.toThrow(/already exists/);
  });

  it("extending gives a new code and retires the old one", async () => {
    const s = await createSandbox({ name: "Cobalt Mechanical", days: 3 });
    const t = (await tenantBySlug(s.slug))!;
    const r = await extendSandbox(s.slug, 10);
    expect(await sandboxCodeOk(t.id, s.code)).toBe(false);
    expect(await sandboxCodeOk(t.id, r.code)).toBe(true);
  });

  it("closes on time: unreachable at once, deleted with everything in it overnight", async () => {
    const s = await createSandbox({ name: "Lakeshore Electric", days: 2 });
    const t = (await tenantBySlug(s.slug))!;
    await withProvisioner((db) => db.query("update tenants set sandbox_expires_at = now() - interval '1 minute' where id = $1", [t.id]));
    expect(await tenantForHost(`${s.slug}.localhost:3100`, cfg())).toBeNull();
    expect(await sandboxCodeOk(t.id, s.code)).toBe(false);

    const gone = await deleteExpiredSandboxes();
    expect(gone).toContain(s.slug);
    const left = await withProvisioner(async (db) => (await db.query("select 1 from snapshots where tenant_id = $1", [t.id])).rowCount, { tenantId: t.id });
    expect(left).toBe(0);
    expect(await tenantBySlug(s.slug)).toBeNull();
  });

  it("can never delete the public demo or a real workspace", async () => {
    expect(await deleteSandbox("demo")).toBe(false);
    expect(await deleteSandbox("acme")).toBe(false);
    expect(await tenantBySlug("demo")).not.toBeNull();
    expect(await tenantBySlug("acme")).not.toBeNull();
    const demoUntil = await withPlatform(async (db) => (await db.query<{ s: Date | null }>("select sandbox_expires_at as s from tenants where slug = 'demo'")).rows[0].s);
    expect(demoUntil).toBeNull();
  });
});
