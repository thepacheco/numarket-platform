import { validateEntry, type FieldDef } from "@numarket/db/repo/workspace";
import { parseCsv } from "./csv";

/* Checking an uploaded file against an input screen's template. Columns are
   matched by heading (field name or label); every row goes through the same
   validation as the screen itself. */

export const MAX_UPLOAD_BYTES = 500_000;
export const MAX_UPLOAD_ROWS = 1000;

export type CheckedRow = { line: number; ok: boolean; errors: string[]; cells: string[]; data: Record<string, unknown> };
export type UploadCheck = { columns: string[]; missing: string[]; ignored: string[]; rows: CheckedRow[]; valid: number; invalid: number };

const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");

export function checkUpload(text: string, fields: FieldDef[], ctx: { jobs: { code: string; name: string }[]; today: string }): UploadCheck | { error: string } {
  if (text.length > MAX_UPLOAD_BYTES) return { error: `The file is too large. Split it into files under ${Math.round(MAX_UPLOAD_BYTES / 1000)} KB.` };
  const table = parseCsv(text);
  if (table.length < 2) return { error: "The file needs a heading row and at least one row of data." };
  if (table.length - 1 > MAX_UPLOAD_ROWS) return { error: `The file has ${table.length - 1} rows. Upload ${MAX_UPLOAD_ROWS} or fewer at a time.` };
  const head = table[0].map((h) => h.trim());
  const index: Record<string, number> = {};
  const ignored: string[] = [];
  head.forEach((h, i) => {
    const f = fields.find((x) => norm(x.key) === norm(h) || norm(x.label) === norm(h));
    if (f && index[f.key] === undefined) index[f.key] = i;
    else if (h) ignored.push(h);
  });
  const missing = fields.filter((f) => f.required && index[f.key] === undefined).map((f) => f.label);
  if (missing.length) return { error: `The file is missing ${missing.length === 1 ? "a column" : "columns"}: ${missing.join(", ")}. Download the template to see the headings.` };

  const byName = new Map(ctx.jobs.map((j) => [norm(j.name), j.code]));
  const codes = ctx.jobs.map((j) => j.code);
  const rows = table.slice(1).map((cells, n): CheckedRow => {
    const raw: Record<string, string> = {};
    for (const f of fields) {
      let v = index[f.key] === undefined ? "" : (cells[index[f.key]] ?? "").trim();
      if (f.options === "jobs" && v && !codes.includes(v)) v = byName.get(norm(v)) ?? v.replace(/^job\s*/i, "");
      if (f.type === "date" && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)) {
        const [m, d, y] = v.split("/");
        v = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
      if (f.type === "number") v = v.replace(/[$%\s]/g, "");
      raw[f.key] = v;
    }
    const r = validateEntry(fields, raw, { jobs: codes, today: ctx.today });
    const errors = r.ok ? [] : Object.values(r.errors).map((e) => (e.startsWith("Choose a valid job") ? "Job isn't one of yours, or the code is wrong." : e));
    return { line: n + 2, ok: r.ok, errors, cells: fields.map((f) => raw[f.key]), data: r.ok ? r.data : {} };
  });
  return { columns: fields.map((f) => f.label), missing, ignored, rows, valid: rows.filter((r) => r.ok).length, invalid: rows.filter((r) => !r.ok).length };
}

export type UploadResult = { ok: boolean; message: string; check?: Omit<UploadCheck, "rows"> & { rows: Omit<CheckedRow, "data">[] }; imported?: number };

/** One example value per field, for the downloadable template. */
export function exampleValue(f: FieldDef, ctx: { jobs: { code: string }[]; today: string }) {
  if (f.options === "jobs") return ctx.jobs[0]?.code ?? "";
  if (f.type === "select") return f.options?.[0] ?? "";
  if (f.type === "date") return ctx.today;
  if (f.type === "number") return f.max !== undefined && f.max <= 100 ? Math.round(f.max * 0.4) : f.max !== undefined && f.max <= 1000 ? 48 : 12500;
  return f.key === "note" ? "Poured footings at the north abutment" : f.key === "description" ? "Relocated storm drain at the east approach" : "Example";
}
