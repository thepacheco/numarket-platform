/* Comparing with last year, drilling to the rows behind a number, pins that
   keep their view, and the QBR's year-over-year quarter. Pure functions only. */
import { describe, expect, it } from "vitest";
import { resolveRange } from "../packages/blocks/src/index";
import { parsePinView, pinBase, pinViewLabel, pinViewQuery, splitPin } from "../apps/portal/lib/pinView";
import { rowMatch, rowsHref } from "../apps/portal/lib/drill";
import { priorQuarter, quarterOf } from "../apps/portal/lib/qbr";
import { dueDate } from "../apps/portal/lib/dates";

describe("compare with", () => {
  it("defaults to the period just before", () => {
    const r = resolveRange("2026-10", "3m");
    expect(r.current).toEqual({ from: "2026-07", to: "2026-09" });
    expect(r.prior).toEqual({ from: "2026-04", to: "2026-06" });
    expect(r.compare).toBe("prior");
  });
  it("can compare with the same months last year", () => {
    const r = resolveRange("2026-10", "3m", null, null, "year");
    expect(r.prior).toEqual({ from: "2025-07", to: "2025-09" });
    expect(r.compareLabel).toBe("vs same period last year");
    expect(r.compare).toBe("year");
  });
  it("this month has a comparison only against last year", () => {
    expect(resolveRange("2026-10", "mtd").prior).toBeNull();
    expect(resolveRange("2026-10", "mtd", null, null, "year").prior).toEqual({ from: "2025-10", to: "2025-10" });
  });
  it("the QBR can compare a quarter with the same quarter last year", () => {
    const q = quarterOf("2026-08");
    expect(priorQuarter(q).label).toBe("Q2 2026");
    expect(priorQuarter(q, "year").label).toBe("Q3 2025");
  });
});

describe("pins that keep their view", () => {
  it("round-trips a view and labels it", () => {
    const v = parsePinView("job=114&range=3m&cmp=year&as=table");
    expect(v).toEqual({ job: "114", range: "3m", cmp: "year", as: "table" });
    expect(pinViewLabel(v, () => "Route 9 Bridge")).toBe("Route 9 Bridge · Last 3 months · vs last year · Table");
    expect(splitPin(`kpi:pnl:revenue?${pinViewQuery(v)}`)).toEqual({ id: "kpi:pnl:revenue", view: v });
    expect(pinBase("kpi:pnl:revenue?job=114")).toBe("kpi:pnl:revenue");
  });
  it("drops anything that isn't a known option", () => {
    expect(parsePinView("job=<script>&range=forever&as=pie&cmp=always")).toBeNull();
    expect(parsePinView("range=custom&from=2026-01")).toBeNull();
    expect(parsePinView("range=custom&from=2026-01&to=2026-03")).toEqual({ range: "custom", from: "2026-01", to: "2026-03" });
  });
});

describe("the rows behind a number", () => {
  const range = resolveRange("2026-10", "6m");
  it("opens the dataset's Explore view with the same period and job", () => {
    expect(rowsHref("cost_trend", { range, job: "114" })).toBe("/explore/job-cost?group=detail&range=6m&job=114");
    expect(rowsHref("ar_aging", { range })).toBe("/explore/ar-aging");
    expect(rowsHref("cash", { range })).toBeNull();
  });
  it("narrows to one row's key, like an account or a customer", () => {
    const m = rowMatch("pnl", { account: "Contract revenue", amount: 1 });
    expect(m).toEqual({ field: "account", value: "Contract revenue" });
    expect(rowsHref("pnl", { range }, m)).toBe("/explore/pnl-by-account?group=detail&range=6m&w=account%7Eeq%7EContract+revenue");
    expect(rowMatch("cost_trend", { job: "114" })).toBeUndefined();
  });
});

describe("action item due dates", () => {
  it("read the year from the review, rolling into January", () => {
    expect(dueDate("Oct 27", "2026-09")?.toISOString().slice(0, 10)).toBe("2026-10-27");
    expect(dueDate("Jan 5", "2026-12")?.toISOString().slice(0, 10)).toBe("2027-01-05");
    expect(dueDate("someday", "2026-09")).toBeNull();
  });
});
