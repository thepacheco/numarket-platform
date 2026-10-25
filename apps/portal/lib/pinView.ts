import { RANGE_OPTIONS, validYm, type RangeKey } from "@numarket/blocks";

/* A pin on Home can keep the view it was pinned from: one job, a period,
   last year's comparison, or the chart shown another way. It's stored with
   the block id as "id?job=114&range=3m". Everything is checked again when
   it's drawn, so a pin can never show more than the person may see. */

export type PinMode = "line" | "bars" | "table" | "heat";
export type PinView = { job?: string; range?: RangeKey; from?: string; to?: string; cmp?: "year"; as?: PinMode };
const MODES: PinMode[] = ["line", "bars", "table", "heat"];

export const pinBase = (entry: string) => entry.split("?")[0];

export function parsePinView(qs: string | undefined | null): PinView | null {
  if (!qs) return null;
  const q = new URLSearchParams(qs);
  const v: PinView = {};
  const job = q.get("job");
  if (job && /^[A-Za-z0-9_-]{1,20}$/.test(job)) v.job = job;
  const range = q.get("range");
  if (range && RANGE_OPTIONS.some((o) => o.key === range)) {
    v.range = range as RangeKey;
    if (range === "custom") {
      const from = q.get("from"), to = q.get("to");
      if (validYm(from) && validYm(to)) Object.assign(v, { from, to });
      else delete v.range;
    }
  }
  if (q.get("cmp") === "year") v.cmp = "year";
  const as = q.get("as");
  if (as && MODES.includes(as as PinMode)) v.as = as as PinMode;
  return Object.keys(v).length ? v : null;
}

export function pinViewQuery(v: PinView | null) {
  if (!v) return "";
  const q = new URLSearchParams();
  for (const [k, x] of Object.entries(v)) if (x) q.set(k, x);
  return q.toString();
}

export function splitPin(entry: string) {
  const i = entry.indexOf("?");
  return i < 0 ? { id: entry, view: null } : { id: entry.slice(0, i), view: parsePinView(entry.slice(i + 1)) };
}

/** "Route 9 Bridge · Last 3 months · vs last year · Table" */
export function pinViewLabel(v: PinView | null, jobName: (code: string) => string | undefined) {
  if (!v) return "";
  const parts: string[] = [];
  if (v.job) parts.push(jobName(v.job) ?? v.job);
  if (v.range) parts.push(v.range === "custom" && v.from && v.to ? `${v.from} to ${v.to}` : (RANGE_OPTIONS.find((o) => o.key === v.range)?.label ?? v.range));
  if (v.cmp === "year") parts.push("vs last year");
  if (v.as) parts.push({ line: "Line", bars: "Bars", table: "Table", heat: "Heat map" }[v.as]);
  return parts.join(" · ");
}
