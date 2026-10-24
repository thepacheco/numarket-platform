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
