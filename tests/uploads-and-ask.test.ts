/* File uploads (CSV in and out) and the demo's Ask Your Data answers. */
import { describe, expect, it } from "vitest";
import { csvCell, parseCsv } from "../apps/portal/lib/csv";
import { checkUpload } from "../apps/portal/lib/upload";
import { answer } from "../apps/portal/lib/ask";
import { SCREENS } from "../packages/db/src/demo/config";
import { buildDatasets, SUMMIT_JOBS } from "../packages/db/src/demo/construction";
import type { FieldDef } from "../packages/db/src/repo/workspace";

const field = SCREENS.find((s) => s.slug === "daily-field-report")!.fields as FieldDef[];
const jobs = [
  { code: "114", name: "Route 9 Bridge" },
  { code: "121", name: "Data Center Shell" },
];
const today = "2026-10-04";

describe("CSV", () => {
  it("parses quotes, doubled quotes, CRLF, a BOM, and blank lines", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n\r\n1,2')).toEqual([["a", "b"], ["x, y", 'say "hi"'], ["1", "2"]]);
  });
  it("keeps negative numbers as numbers but defuses formula text", () => {
    expect(csvCell(-1234)).toBe("-1234");
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-2+3")).toBe("'-2+3");
    expect(csvCell('a "b", c')).toBe('"a ""b"", c"');
  });
});

describe("upload check", () => {
  it("matches headings by label, accepts job names and US dates, and flags bad rows", () => {
    const csv = ["Job,Date,Crew hours,Note,Extra", "Route 9 Bridge,10/03/2026,64,Deck pour,x", "127,2026-10-02,40,,", "121,2026-10-09,10,,", "114,2026-10-01,9999,,"].join("\n");
    const c = checkUpload(csv, field, { jobs, today });
    if ("error" in c) throw new Error(c.error);
    expect(c.valid).toBe(1);
    expect(c.rows[0]).toMatchObject({ ok: true, data: { job: "114", date: "2026-10-03", crew_hours: 64 } });
    expect(c.rows[1].errors.join(" ")).toMatch(/isn't one of yours/); // job 127 is outside this person's jobs
    expect(c.rows[2].errors.join(" ")).toMatch(/future/);
    expect(c.rows[3].errors.join(" ")).toMatch(/more than/);
    expect(c.ignored).toEqual(["Extra"]);
  });
  it("refuses a file without the required columns", () => {
    const c = checkUpload("Job,Note\n114,hi", field, { jobs, today });
    expect("error" in c && c.error).toMatch(/missing columns: Date, Crew hours/);
  });
});

describe("Ask Your Data (demo)", () => {
  const datasets = buildDatasets(SUMMIT_JOBS, [], new Date("2026-10-04T12:00:00Z"));
  const all = { datasets, scope: null, asOf: "2026-10" };
  const pm = { datasets, scope: { dimension: "job", values: ["114"] }, asOf: "2026-10" };
  it("answers over-budget, receivables, and job questions from the data", () => {
    expect(answer("Which jobs are over budget?", all, "").title).toBe("Jobs costing more than budgeted");
    const ar = answer("Who owes us money over 60 days?", all, "");
    expect(ar.ok).toBe(true);
    expect(ar.text).toMatch(/Halden County DOT/);
    expect(answer("How is Route 9 Bridge doing?", all, "").title).toBe("Route 9 Bridge (job 114)");
  });
  it("keeps a scoped person inside their jobs", () => {
    expect(answer("How much cash do we have?", pm, "Route 9 Bridge").ok).toBe(false);
    const co = answer("Change orders in the last 12 months", pm, "Route 9 Bridge");
    expect(co.table!.rows.map((r) => r[0])).toEqual(["Route 9 Bridge"]);
    expect(answer("How is Data Center Shell doing?", pm, "Route 9 Bridge").title).not.toMatch(/Data Center/);
  });
});
