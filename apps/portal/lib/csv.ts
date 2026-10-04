/* CSV in and out. Cells that a spreadsheet would run as a formula get a
   leading apostrophe; real numbers (including negatives) are left alone. */

export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  const s = String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export const csvLine = (cells: unknown[]) => cells.map(csvCell).join(",");

/** RFC 4180 parser: quoted fields, doubled quotes, CRLF or LF, BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
