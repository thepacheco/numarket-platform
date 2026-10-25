import type { RangeSel, Row } from "@numarket/blocks";

/* Drilling down: from a number on a dashboard to the rows behind it in
   Explore, with the same period and job. Each dataset opens the Explore
   view that holds its rows. */

const EXPLORE: Record<string, { slug: string; group?: string; dated: boolean; job: boolean; key?: string }> = {
  pnl: { slug: "pnl-by-account", group: "detail", dated: true, job: false, key: "account" },
  cost_trend: { slug: "job-cost", group: "detail", dated: true, job: true },
  job_summary: { slug: "job-cost", group: "job", dated: true, job: true },
  change_orders: { slug: "change-orders", group: "detail", dated: true, job: true, key: "cause" },
  rfis: { slug: "open-rfis", dated: false, job: true },
  rfi_trend: { slug: "open-rfis", dated: false, job: true },
  field_reports: { slug: "field-reports", group: "detail", dated: true, job: true },
  crew_hours_monthly: { slug: "field-reports", group: "detail", dated: true, job: true },
  revenue_by_customer: { slug: "revenue-by-customer", group: "detail", dated: true, job: false, key: "customer" },
  ar_aging: { slug: "ar-aging", dated: false, job: false, key: "customer" },
  ap_aging: { slug: "ap-aging", dated: false, job: false, key: "vendor" },
  vendor_spend: { slug: "vendor-spend", group: "vendor", dated: true, job: false, key: "vendor" },
};

/** The Explore view holding a dataset's rows, filtered like the dashboard. */
export function rowsHref(dataset: string, f: { range: RangeSel | null; job?: string }, match?: { field: string; value: string }) {
  const e = EXPLORE[dataset];
  if (!e) return null;
  const q = new URLSearchParams();
  if (e.group) q.set("group", e.group);
  if (e.dated && f.range) {
    q.set("range", f.range.key);
    if (f.range.key === "custom") {
      q.set("from", f.range.current.from);
      q.set("to", f.range.current.to);
    }
  }
  if (e.job && f.job) q.set("job", f.job);
  if (match) q.set("w", `${match.field}~eq~${match.value.replace(/[|~]/g, " ").slice(0, 60)}`);
  const qs = q.toString();
  return `/explore/${e.slug}${qs ? `?${qs}` : ""}`;
}

/** The rows behind one line of a table: the row's own key (customer, vendor, cause, account). */
export function rowMatch(dataset: string, row: Row) {
  const key = EXPLORE[dataset]?.key;
  return key && row[key] != null ? { field: key, value: String(row[key]) } : undefined;
}
