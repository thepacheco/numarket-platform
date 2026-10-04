/* Input screen entries reach dashboards only through a published snapshot
   (Spec §3.4–3.5), and the demo reset puts everything back. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closePool, withTenant } from "../packages/db/src/client";
import { LABOR_RATE } from "../packages/db/src/demo/construction";
import { resetDemoTenant } from "../packages/db/src/provision";
import { latestSnapshot, pendingEntryCount, publishSimulated } from "../packages/db/src/repo/snapshots";
import { insertEntry } from "../packages/db/src/repo/workspace";
import { tenantBySlug, type Tenant } from "../packages/auth/src/context";
import { kpiData, visibleRows, type KpiBlock } from "../packages/blocks/src/index";

let demo: Tenant;
let userId: string;
beforeAll(async () => {
  demo = (await tenantBySlug("demo"))!;
  userId = await withTenant(demo.id, async (db) => (await db.query<{ user_id: string }>("select user_id from memberships where persona = 'field'")).rows[0].user_id);
});
afterAll(async () => {
  await resetDemoTenant(demo.id);
  await closePool();
});

const actualOf = (ds: Record<string, Record<string, unknown>[]>, job: string) => Number(ds.job_summary.find((r) => r.job === job)!.actual);

describe("publishing", () => {
  it("an entry is pending until the next publish, then changes the numbers", async () => {
    const before = (await withTenant(demo.id, latestSnapshot))!;
    await withTenant(demo.id, (db) => insertEntry(db, "daily-field-report", { job: "114", date: "2026-10-02", crew_hours: 50, note: "test" }, userId));

    const mid = (await withTenant(demo.id, latestSnapshot))!;
    expect(mid.version).toBe(before.version);
    expect(actualOf(mid.datasets, "114")).toBe(actualOf(before.datasets, "114"));
    expect((await withTenant(demo.id, pendingEntryCount)).n).toBe(1);

    const pub = await withTenant(demo.id, (db) => publishSimulated(db, demo, "manual", userId));
    expect(pub).toEqual({ version: before.version + 1, entriesApplied: 1 });

    const after = (await withTenant(demo.id, latestSnapshot))!;
    expect(actualOf(after.datasets, "114") - actualOf(before.datasets, "114")).toBe(50 * LABOR_RATE);
    expect((await withTenant(demo.id, pendingEntryCount)).n).toBe(0);
  });

  it("KPIs follow the user's scope", async () => {
    const snap = (await withTenant(demo.id, latestSnapshot))!;
    const block: KpiBlock = { type: "kpi", title: "Open RFIs", dataset: "job_summary", value: { agg: "sum", field: "open_rfis" }, format: "num" };
    const all = kpiData(block, visibleRows(snap.datasets, "job_summary", null)).value!;
    const pm = kpiData(block, visibleRows(snap.datasets, "job_summary", { dimension: "job", values: ["114"] })).value!;
    expect(pm).toBe(21);
    expect(all).toBeGreaterThan(pm);
  });

  it("the demo reset clears entries and starts again at version 1", async () => {
    await resetDemoTenant(demo.id);
    const snap = (await withTenant(demo.id, latestSnapshot))!;
    expect(snap.version).toBe(1);
    const entries = await withTenant(demo.id, async (db) => (await db.query("select 1 from input_entries")).rowCount);
    expect(entries).toBe(0);
  });
});
