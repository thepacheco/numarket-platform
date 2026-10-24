import { fmt, type Datasets } from "@numarket/blocks";

/* What the company's own recent work says about pricing: how far over the
   budget for work done its jobs are running, so a new estimate carries
   enough contingency. From the same job summary the dashboards use. */
export function pricingHistory(ds: Datasets | undefined) {
  const jobs = (ds?.job_summary ?? []).map((j) => ({ name: String(j.name), actual: Number(j.actual) || 0, earned: Number(j.earned) || 0 })).filter((j) => j.earned > 0);
  if (!jobs.length) return null;
  const over = jobs.map((j) => ({ ...j, pct: (j.actual - j.earned) / j.earned })).filter((j) => j.pct > 0.005).sort((a, b) => b.pct - a.pct);
  const avgOver = over.length ? over.reduce((t, j) => t + j.pct, 0) / over.length : 0;
  const suggested = Math.min(25, Math.max(3, Math.ceil(avgOver * 100) + 2));
  return {
    jobs: jobs.length,
    over: over.length,
    worst: over[0] ? `${over[0].name}, ${fmt(over[0].pct, "pct")} over` : null,
    avgOver,
    suggested,
  };
}
