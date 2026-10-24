/* Alerts, the example Engineering apps, and the QBR pack's quarters: the
   pure logic behind them, on the construction sample data. */
import { describe, expect, it } from "vitest";
import { evaluate, isoWeek, weeklySummary, type AlertRule } from "../apps/portal/lib/alerts";
import { pricingHistory } from "../apps/portal/lib/estimates";
import { completeQuarters, quarterOf, quarterRange } from "../apps/portal/lib/qbr";
import { estimateTotals, sampleAlerts, sampleApps } from "../packages/db/src/demo/apps";
import { buildDatasets, SUMMIT_JOBS } from "../packages/db/src/demo/construction";
import { CONSTRUCTION } from "../packages/db/src/demo/vocab";

const ds = buildDatasets(SUMMIT_JOBS, [], new Date("2026-10-04T12:00:00Z"));
const everyone = { scope: null, wholeCompany: true, flags: true };
const routeNineOnly = { scope: { dimension: "job", values: ["114"] }, wholeCompany: false, flags: false };
const rule = (kind: AlertRule["kind"], params: AlertRule["params"] = {}): AlertRule => ({ id: "r", kind, params, email: true, active: true });

describe("alerts", () => {
  it("finds jobs over budget for the work done, worst first, one key per job and month", () => {
    const f = evaluate(rule("job_over_budget", { amount: 0 }), ds, everyone, CONSTRUCTION, "2026-10");
    expect(f.length).toBeGreaterThan(0);
    expect(new Set(f.map((x) => x.key)).size).toBe(f.length);
    expect(f.every((x) => x.key.endsWith(":2026-10"))).toBe(true);
    const high = evaluate(rule("job_over_budget", { amount: 1e9 }), ds, everyone, CONSTRUCTION, "2026-10");
    expect(high).toEqual([]);
  });
  it("keeps a person with a data scope to their own jobs", () => {
    const f = evaluate(rule("job_over_budget", { amount: 0 }), ds, routeNineOnly, CONSTRUCTION, "2026-10");
    expect(f.every((x) => x.key.startsWith("job_over_budget:114:"))).toBe(true);
    const rfis = evaluate(rule("rfi_waiting", { days: 1 }), ds, routeNineOnly, CONSTRUCTION, "2026-10");
    expect(rfis.every((x) => x.link.includes("job=114"))).toBe(true);
  });
  it("never shows company-wide money alerts to a scoped person", () => {
    expect(evaluate(rule("ar_over_60", { amount: 0 }), ds, routeNineOnly, CONSTRUCTION, "2026-10")).toEqual([]);
    expect(evaluate(rule("cash_below", { amount: 1e12 }), ds, routeNineOnly, CONSTRUCTION, "2026-10")).toEqual([]);
    expect(evaluate(rule("ar_over_60", { amount: 0 }), ds, everyone, CONSTRUCTION, "2026-10").length).toBe(1);
  });
  it("paused rules and flags outside a scope stay quiet", () => {
    expect(evaluate({ ...rule("job_over_budget", { amount: 0 }), active: false }, ds, everyone, CONSTRUCTION, "2026-10")).toEqual([]);
    const flags = [{ id: "a", title: "x", job: "121" }, { id: "b", title: "y", job: null }];
    expect(evaluate(rule("flag_opened"), ds, { ...routeNineOnly, flags: true }, CONSTRUCTION, "2026-10", flags).map((x) => x.key)).toEqual(["flag:b"]);
  });
  it("the Monday summary names the job furthest over", () => {
    const s = weeklySummary(ds, everyone, CONSTRUCTION);
    const worst = [...s.jobs].sort((a, b) => b.over - a.over)[0];
    expect(s.headline).toContain(worst.name);
    expect(weeklySummary(ds, routeNineOnly, CONSTRUCTION).jobs.map((j) => j.code)).toEqual(["114"]);
  });
  it("numbers weeks the ISO way", () => {
    expect(isoWeek(new Date("2026-10-26T12:00:00Z"))).toBe("2026-W44");
    expect(isoWeek(new Date("2027-01-01T12:00:00Z"))).toBe("2026-W53");
  });
  it("sample alerts belong to sample people of the same industry", () => {
    expect(sampleAlerts("construction").every((a) => a.by.endsWith("@summitbuilders.example"))).toBe(true);
    expect(sampleAlerts("services").every((a) => a.by.endsWith("@brightline.example"))).toBe(true);
  });
});

describe("estimates", () => {
  it("adds overhead, then contingency, then profit, on top of direct cost", () => {
    const t = estimateTotals({ lines: [{ section: "Labor", description: "Crew", qty: 1200, unit: "hours", unitCost: 68 }], overheadPct: 8, contingencyPct: 8, profitPct: 7 });
    expect(t.direct).toBe(81_600);
    expect(Math.round(t.total)).toBe(101_841);
  });
  it("suggests contingency from how far over the company's jobs are running", () => {
    const h = pricingHistory(ds)!;
    expect(h.suggested).toBeGreaterThanOrEqual(3);
    expect(h.suggested).toBeLessThanOrEqual(25);
    expect(h.over).toBeGreaterThan(0);
  });
  it("sample approvals and estimates are fictional and well formed", () => {
    for (const ind of ["construction", "services"] as const) {
      const { approvals, estimates } = sampleApps(ind);
      expect(approvals.some((a) => a.status === "pending")).toBe(true);
      expect(estimates.every((e) => estimateTotals(e.data).total > 0)).toBe(true);
      expect([...approvals, ...estimates].every((r) => r.by.endsWith(".example"))).toBe(true);
    }
  });
});

describe("QBR quarters", () => {
  it("uses the last complete quarter and compares with the one before", () => {
    expect(quarterOf("2026-08")).toMatchObject({ key: "2026-Q3", from: "2026-07", to: "2026-09" });
    const qs = completeQuarters("2026-10");
    expect(qs.map((q) => q.key)).toEqual(["2026-Q3", "2026-Q2", "2026-Q1", "2025-Q4"]);
    expect(completeQuarters("2026-01")[0].key).toBe("2025-Q4");
    expect(quarterRange(qs[0]).prior).toEqual({ from: "2026-04", to: "2026-06" });
  });
});

describe("Explore filters and view alerts", async () => {
  const { DATA_REPORTS } = await import("../packages/db/src/demo/config");
  const { parseWhere, run, runState, whereParam } = await import("../apps/portal/lib/explore");
  const { viewBaseline } = await import("../apps/portal/lib/alerts");
  const rfis = DATA_REPORTS.find((r) => r.slug === "open-rfis")!;
  const def = rfis.definition as import("@numarket/blocks").DataReportDef;
  const views = { "open-rfis": { title: rfis.title, definition: def } };
  const viewRule = (params: AlertRule["params"]): AlertRule => ({ id: "v1", kind: "view", params: { slug: "open-rfis", ...params }, email: false, active: true });

  it("filters by any column and keeps only valid filters", () => {
    const cols = def.groupings[0].columns;
    expect(parseWhere("days_open~gt~30|nope~gt~1|days_open~gt~abc|subject~has~door", cols).map((w) => w.field)).toEqual(["days_open", "subject"]);
    const st = runState(def, ds, null, { w: "days_open~gt~30" }, "2026-10");
    const out = run(def, ds, null, st);
    expect(out.rows.length).toBeGreaterThan(0);
    expect(out.rows.every((r) => Number(r.days_open) > 30)).toBe(true);
    expect(whereParam(st.where)).toBe("days_open~gt~30");
  });
  it("a scoped person's view only has their jobs", () => {
    const st = runState(def, ds, routeNineOnly.scope, {}, "2026-10");
    expect(run(def, ds, routeNineOnly.scope, st).rows.every((r) => r.job_name === "Route 9 Bridge")).toBe(true);
  });
  it("a view alert ignores rows that were there when it was set", () => {
    const q = "w=days_open~gt~10";
    const seen = viewBaseline(def, ds, null, q, "2026-10");
    expect(seen.length).toBeGreaterThan(0);
    expect(evaluate(viewRule({ q, cond: "rows", seen }), ds, everyone, CONSTRUCTION, "2026-10", [], views)).toEqual([]);
    const fresh = evaluate(viewRule({ q, cond: "rows", seen: seen.slice(1) }), ds, everyone, CONSTRUCTION, "2026-10", [], views);
    expect(fresh.length).toBe(1);
    expect(fresh[0].link).toBe(`/explore/open-rfis?${q}`);
  });
  it("a total alert fires once a month when the line is crossed", () => {
    const above = evaluate(viewRule({ cond: "total", column: "days_open", op: "above", amount: 1 }), ds, everyone, CONSTRUCTION, "2026-10", [], views);
    expect(above.map((f) => f.key)).toEqual(["view:v1:total:2026-10"]);
    expect(evaluate(viewRule({ cond: "total", column: "days_open", op: "below", amount: 1 }), ds, everyone, CONSTRUCTION, "2026-10", [], views)).toEqual([]);
  });
});
