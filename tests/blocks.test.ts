/* Date ranges, prior-period comparison, and the P&L statement. */
import { describe, expect, it } from "vitest";
import { kpiData, resolveRange, seriesData, statementData, visibleRows, type KpiBlock, type StatementBlock } from "../packages/blocks/src/index";
import { buildDatasets, SUMMIT_JOBS } from "../packages/db/src/demo/construction";

const asOf = new Date("2026-10-04T12:00:00Z");
const ds = buildDatasets(SUMMIT_JOBS, [], asOf);

describe("date ranges", () => {
  it("last 12 months means the 12 complete months, compared with the 12 before", () => {
    const r = resolveRange("2026-10", "12m");
    expect(r.current).toEqual({ from: "2025-10", to: "2026-09" });
    expect(r.prior).toEqual({ from: "2024-10", to: "2025-09" });
  });
  it("year to date runs through last month and compares with the same months last year; this month has no comparison", () => {
    expect(resolveRange("2026-10", "ytd")).toMatchObject({ current: { from: "2026-01", to: "2026-09" }, prior: { from: "2025-01", to: "2025-09" } });
    expect(resolveRange("2026-10", "mtd").prior).toBeNull();
  });
  it("rejects a bad custom range and falls back to 12 months", () => {
    expect(resolveRange("2026-10", "custom", "2026-13", "x").key).toBe("12m");
    expect(resolveRange("2026-10", "custom", "2026-02", "2026-04").current).toEqual({ from: "2026-02", to: "2026-04" });
  });
  it("filters dated rows and leaves 'as of today' rows alone", () => {
    const r = resolveRange("2026-10", "3m").current;
    const pnl = visibleRows(ds, "pnl", null, { range: r });
    expect(new Set(pnl.map((x) => x.month))).toEqual(new Set(["2026-07", "2026-08", "2026-09"]));
    expect(visibleRows(ds, "ar_aging", null, { range: r })).toHaveLength(ds.ar_aging.length);
  });
});

describe("KPIs with a prior period", () => {
  const rev = { field: "amount", where: { section: "Revenue" } };
  const block: KpiBlock = { type: "kpi", title: "Revenue", dataset: "pnl", value: { agg: "sum", of: rev }, format: "money", compare: true, better: "up" };
  it("computes the change against the prior period", () => {
    const r = resolveRange("2026-10", "12m");
    const d = kpiData(block, visibleRows(ds, "pnl", null, { range: r.current }), visibleRows(ds, "pnl", null, { range: r.prior! }));
    expect(d.value).toBeGreaterThan(0);
    expect(d.change).toBeCloseTo((d.value! - d.prior!) / d.prior!, 6);
    expect(d.tone).toBe(d.change! > 0 ? "good" : "bad");
  });
  it("series fill every month in the range", () => {
    const r = resolveRange("2026-10", "6m");
    const out = seriesData({ type: "columns", title: "x", dataset: "pnl", x: "month", series: [{ label: "Revenue", of: rev }], format: "money" }, visibleRows(ds, "pnl", null, { range: r.current }), r.current);
    expect(out.map((x) => x.key)).toEqual(["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"]);
  });
});

describe("profit and loss statement", () => {
  const block: StatementBlock = {
    type: "statement", title: "P&L", dataset: "pnl", percentOf: "Revenue", groups: ["Revenue", "Cost of goods sold", "Operating expenses"],
    subtotals: [{ label: "Gross profit", after: "Cost of goods sold", plus: ["Revenue"], minus: ["Cost of goods sold"] }, { label: "Net income", after: "Operating expenses", plus: ["Revenue"], minus: ["Cost of goods sold", "Operating expenses"] }],
  };
  it("adds up: net income = revenue − cost of goods sold − operating expenses", () => {
    const rows = visibleRows(ds, "pnl", null, { range: resolveRange("2026-10", "12m").current });
    const lines = statementData(block, rows, null);
    const get = (l: string) => lines.find((x) => x.label === l)!.current;
    expect(get("Net income")).toBeCloseTo(get("Total revenue") - get("Total cost of goods sold") - get("Total operating expenses"), 0);
    expect(get("Gross profit") / get("Total revenue")).toBeGreaterThan(0.1);
  });
});
