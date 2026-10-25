/* Owners choose which dashboards each role sees. Owners always see all of
   them; a list can only name roles that can see dashboards at all. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { tenantBySlug, type Tenant } from "../packages/auth/src/context";
import { closePool, withTenant } from "../packages/db/src/client";
import { dashboardForRole, listDashboards, setDashboardRoles } from "../packages/db/src/repo/workspace";

let acme: Tenant;
let demo: Tenant;
beforeAll(async () => {
  acme = (await tenantBySlug("acme"))!;
  demo = (await tenantBySlug("demo"))!;
});
afterAll(() => closePool());

describe("dashboards per role", () => {
  it("everyone sees a dashboard with no list; owners always do", () => {
    expect(dashboardForRole({ roles: null }, "viewer")).toBe(true);
    expect(dashboardForRole({ roles: ["editor"] }, "viewer")).toBe(false);
    expect(dashboardForRole({ roles: ["editor"] }, "editor")).toBe(true);
    expect(dashboardForRole({ roles: [] }, "owner")).toBe(true);
  });

  it("saves a role list for one workspace only", async () => {
    const slug = (await withTenant(acme.id, listDashboards))[0].slug;
    await withTenant(acme.id, (db) => setDashboardRoles(db, slug, ["editor"]));
    expect((await withTenant(acme.id, listDashboards)).find((d) => d.slug === slug)?.roles).toEqual(["editor"]);
    expect((await withTenant(demo.id, listDashboards)).find((d) => d.slug === slug)?.roles ?? null).toBeNull();
    await withTenant(acme.id, (db) => setDashboardRoles(db, slug, null));
  });

  it("refuses roles that don't belong in the list", async () => {
    const slug = (await withTenant(acme.id, listDashboards))[0].slug;
    await expect(withTenant(acme.id, (db) => setDashboardRoles(db, slug, ["owner"]))).rejects.toThrow();
    await expect(withTenant(acme.id, (db) => setDashboardRoles(db, slug, ["contributor"]))).rejects.toThrow();
  });
});
