/* The Requests board: who can see and add requests, the demo opening with
   work in every column, one workspace never seeing another's requests, and
   change hours counted only for work numarket actually started. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { can, PERMISSIONS } from "../packages/auth/src/permissions";
import { tenantBySlug, type Tenant } from "../packages/auth/src/context";
import { closePool, withTenant } from "../packages/db/src/client";
import { addRequestUpdate, changeHoursUsed, countWaitingOn, getRequest, insertRequest, listRequests, requestUpdates, type RequestRow } from "../packages/db/src/repo/requests";
import { TIER_LIMITS } from "../packages/metering/src/limits";

let demo: Tenant;
let acme: Tenant;
beforeAll(async () => {
  demo = (await tenantBySlug("demo"))!;
  acme = (await tenantBySlug("acme"))!;
});
afterAll(() => closePool());

describe("who can use the board", () => {
  it("viewers and editors see the board and add requests; contributors don't", () => {
    for (const r of ["viewer", "editor", "admin", "owner"] as const) {
      expect(can(r, "requests.view")).toBe(true);
      expect(can(r, "requests.submit")).toBe(true);
    }
    expect(PERMISSIONS.filter((p) => p.startsWith("requests.") && can("contributor", p))).toEqual([]);
  });
  it("only admins and owners sign off on someone else's request", () => {
    expect(can("viewer", "requests.approve")).toBe(false);
    expect(can("editor", "requests.approve")).toBe(false);
    expect(can("admin", "requests.approve")).toBe(true);
    expect(can("owner", "requests.approve")).toBe(true);
  });
});

describe("the demo board", () => {
  it("opens with work in every column, each with its history", async () => {
    const rows = await withTenant(demo.id, listRequests);
    expect(new Set(rows.map((r) => r.status))).toEqual(new Set(["submitted", "planned", "in_progress", "review", "done"]));
    for (const r of rows) expect(r.updates).toBeGreaterThan(0);
  });
});

describe("requests stay inside their workspace", () => {
  it("another workspace can't read a request or its updates by id", async () => {
    const id = await withTenant(demo.id, async (db) => (await listRequests(db))[0].id);
    expect(await withTenant(acme.id, (db) => getRequest(db, id))).toBeNull();
    expect(await withTenant(acme.id, (db) => requestUpdates(db, id))).toEqual([]);
  });
  it("a new request and its updates are written to the current workspace only", async () => {
    const userId = await withTenant(acme.id, async (db) => (await db.query<{ user_id: string }>("select user_id from memberships limit 1")).rows[0].user_id);
    const id = await withTenant(acme.id, async (db) => {
      const id = await insertRequest(db, { kind: "issue", product: "foundation", title: "Test request", detail: "", priority: "normal", link: null, sketch: null, userId });
      await addRequestUpdate(db, id, { author: "Test", userId, body: "Moved", status: "review" });
      return id;
    });
    const r = await withTenant(acme.id, (db) => getRequest(db, id));
    expect(r?.status).toBe("review");
    expect(await withTenant(demo.id, (db) => getRequest(db, id))).toBeNull();
    expect(await withTenant(acme.id, (db) => countWaitingOn(db, userId, false))).toBeGreaterThan(0);
    await expect(withTenant(acme.id, (db) => db.query("delete from requests where id = $1", [id]))).rejects.toThrow();
  });
});

describe("change hours", () => {
  const row = (p: Partial<RequestRow>): RequestRow =>
    ({ kind: "change", status: "done", estimate_hours: "2", updated_at: new Date("2026-10-10"), done_at: new Date("2026-10-10"), ...p }) as RequestRow;
  const month = new Date("2026-10-01T00:00:00Z");
  it("count changes numarket started this month, not ideas still waiting", () => {
    expect(changeHoursUsed([row({}), row({ status: "in_progress", estimate_hours: "3" }), row({ status: "planned" }), row({ kind: "app" })], month)).toBe(5);
  });
  it("don't count last month's work", () => {
    expect(changeHoursUsed([row({ done_at: new Date("2026-09-28"), updated_at: new Date("2026-09-28") })], month)).toBe(0);
  });
  it("match the plans on the website: 2 on Small, 6 on Mid, a dedicated analyst on Large", () => {
    expect([TIER_LIMITS.insight.changeHoursPerMonth, TIER_LIMITS.operate.changeHoursPerMonth, TIER_LIMITS.command.changeHoursPerMonth]).toEqual([2, 6, null]);
  });
});
