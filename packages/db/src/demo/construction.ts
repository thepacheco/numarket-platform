/* Sample construction company for the demo workspace (Summit Builders).

   In production, snapshots are published by the worker from the tenant's
   Snowflake serve tables. In the demo, buildDatasets() plays that role: it
   takes the fixed sample facts below plus every input-screen entry that has
   been applied, and returns the same dataset shapes a real publish would.
   All names and figures are fictional sample data. */

export type JobFact = {
  code: string;
  name: string;
  customer: string;
  budget: number;
  pct: number;
  actual: number;
  rfis: number;
};

export const SUMMIT_JOBS: JobFact[] = [
  { code: "108", name: "Terminal Expansion", customer: "Northgate Airport Authority", budget: 18_400_000, pct: 0.62, actual: 11_890_000, rfis: 14 },
  { code: "114", name: "Route 9 Bridge", customer: "Halden County DOT", budget: 9_600_000, pct: 0.48, actual: 4_920_000, rfis: 21 },
  { code: "121", name: "Data Center Shell", customer: "Ridgeline Data Partners", budget: 24_000_000, pct: 0.35, actual: 8_150_000, rfis: 9 },
  { code: "127", name: "Substation Upgrade", customer: "Piedmont Electric Co-op", budget: 6_200_000, pct: 0.71, actual: 4_310_000, rfis: 4 },
  { code: "133", name: "Medical Office Building", customer: "Magnolia Health Partners", budget: 12_800_000, pct: 0.22, actual: 2_790_000, rfis: 11 },
];

export const ACME_JOBS: JobFact[] = [
  { code: "A1", name: "Warehouse Retrofit", customer: "Acme internal", budget: 2_100_000, pct: 0.4, actual: 900_000, rfis: 3 },
  { code: "A2", name: "Office Fit-Out", customer: "Acme internal", budget: 850_000, pct: 0.75, actual: 610_000, rfis: 1 },
];

export const CAUSES = ["Design errors", "Owner changes", "Unforeseen conditions", "Weather", "Scope additions"] as const;
export const LABOR_RATE = 68;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

/* Small deterministic PRNG so every reset produces the same sample data. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Entry = { id: string; screen_slug: string; data: Record<string, unknown>; created_at: Date | string; created_by_name: string | null };

export type Datasets = Record<string, Record<string, unknown>[]>;

const r0 = (n: number) => Math.round(n);

/** The last 12 month labels ending at `asOf`'s month, like "2026-10". */
export function monthLabels(asOf: Date, n = 12) {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

const dayLabel = (iso: string) => DAYS[(new Date(iso + "T12:00:00Z").getUTCDay() + 6) % 7] ?? "Fri";

export function buildDatasets(jobs: JobFact[], entries: Entry[], asOf: Date): Datasets {
  const rand = rng(jobs.length * 7919 + jobs[0].code.charCodeAt(0));
  const months = monthLabels(asOf);

  /* applied entries, oldest first */
  const sorted = [...entries].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const field = sorted.filter((e) => e.screen_slug === "daily-field-report");
  const cos = sorted.filter((e) => e.screen_slug === "change-order-log");

  const jobState = new Map(jobs.map((j) => [j.code, { ...j }]));
  for (const e of field) {
    const j = jobState.get(String(e.data.job));
    if (!j) continue;
    j.actual += Number(e.data.crew_hours) * LABOR_RATE;
    const pct = e.data.pct_complete;
    if (pct !== undefined && pct !== null && pct !== "") j.pct = Math.min(1, Math.max(0, Number(pct) / 100));
  }

  /* change orders by cause: a fixed sample split, plus logged entries */
  const coRows: Record<string, unknown>[] = [];
  for (const j of jobs) {
    const weights = CAUSES.map(() => 0.4 + rand());
    if (j.code === "114") weights[0] *= 3.2; // design errors drive Route 9 Bridge
    const total = j.budget * (0.035 + rand() * 0.03);
    const wsum = weights.reduce((a, b) => a + b, 0);
    CAUSES.forEach((c, i) => coRows.push({ job: j.code, job_name: j.name, cause: c, amount: r0((total * weights[i]) / wsum), count: 1 + Math.floor(rand() * 6) }));
  }
  for (const e of cos) {
    const row = coRows.find((r) => r.job === String(e.data.job) && r.cause === String(e.data.cause));
    if (row) {
      row.amount = Number(row.amount) + Number(e.data.amount);
      row.count = Number(row.count) + 1;
    }
  }

  /* monthly earned vs. actual (S-curve spread of the totals) */
  const trend: Record<string, unknown>[] = [];
  for (const base of jobs) {
    const j = jobState.get(base.code)!;
    const w = months.map((_, i) => Math.sin(((i + 1) / months.length) * Math.PI * 0.9) + 0.35 + rand() * 0.25);
    const ws = w.reduce((a, b) => a + b, 0);
    const earnedTotal = base.budget * base.pct;
    months.forEach((m, i) => {
      const share = w[i] / ws;
      trend.push({ job: base.code, month: m, earned: r0(earnedTotal * share), actual: r0(base.actual * share * (0.97 + rand() * 0.06)) });
    });
    /* everything entered since the sample was taken lands in the current month */
    const last = trend[trend.length - 1];
    last.actual = Number(last.actual) + (j.actual - base.actual);
    last.earned = Number(last.earned) + (j.budget * j.pct - earnedTotal);
  }

  /* crew hours this week: sample baseline plus field reports */
  const hours = new Map<string, number>();
  for (const j of jobs) for (const d of DAYS) hours.set(`${j.code}|${d}`, r0(20 + rand() * 60));
  for (const e of field) {
    const key = `${e.data.job}|${dayLabel(String(e.data.date))}`;
    hours.set(key, (hours.get(key) ?? 0) + Number(e.data.crew_hours));
  }
  const crew = jobs.flatMap((j) => DAYS.map((d) => {
    const h = hours.get(`${j.code}|${d}`) ?? 0;
    return { job: j.code, job_name: j.name, day: d, hours: h, labor_cost: r0(h * LABOR_RATE) };
  }));

  /* field reports: newest first, bounded */
  const supers = ["Luis Ortiz", "Kim Alvarez", "Ray Dunn"];
  const sampleReports = jobs.slice(0, 4).map((j, i) => ({
    job: j.code,
    job_name: j.name,
    date: isoDay(asOf, -(i + 1)),
    crew_hours: 40 + i * 12,
    by: supers[i % supers.length],
    note: ["Steel delivery on time", "Waiting on RFI 207 response", "Pour scheduled Thursday", "Inspection passed"][i],
    via: "Sample",
  }));
  const entered = [...field].reverse().map((e) => ({
    job: String(e.data.job),
    job_name: jobState.get(String(e.data.job))?.name ?? String(e.data.job),
    date: String(e.data.date),
    crew_hours: Number(e.data.crew_hours),
    by: e.created_by_name ?? "Team member",
    note: String(e.data.note ?? ""),
    via: "Input screen",
  }));
  const fieldReports = [...entered, ...sampleReports].slice(0, 25);

  /* open RFIs (bounded detail) */
  const subjects = ["Rebar spacing at pier 3", "Door hardware spec", "Slab embed conflict", "Roof drain location", "Fire damper access", "Duct routing at grid C", "Anchor bolt pattern", "Curtain wall mullion size"];
  const ballInCourt = ["Architect", "Structural engineer", "Owner", "MEP engineer"];
  const rfis: Record<string, unknown>[] = [];
  let n = 180;
  for (const j of jobs) {
    for (let i = 0; i < Math.min(4, j.rfis); i++) {
      rfis.push({ job: j.code, job_name: j.name, number: `RFI ${n++}`, subject: subjects[Math.floor(rand() * subjects.length)], days_open: 3 + Math.floor(rand() * 30), ball_in_court: ballInCourt[Math.floor(rand() * ballInCourt.length)] });
    }
  }
  rfis.sort((a, b) => Number(b.days_open) - Number(a.days_open));

  const summary = jobs.map((base) => {
    const j = jobState.get(base.code)!;
    const earned = j.budget * j.pct;
    const cpi = earned / j.actual;
    const coTotal = coRows.filter((r) => r.job === j.code).reduce((t, r) => t + Number(r.amount), 0);
    return {
      job: j.code,
      name: j.name,
      customer: j.customer,
      budget: j.budget,
      actual: r0(j.actual),
      earned: r0(earned),
      over: r0(j.actual - earned),
      cpi: Math.round(cpi * 100) / 100,
      pct_complete: Math.round(j.pct * 1000) / 1000,
      open_rfis: j.rfis,
      change_orders: coTotal,
      status: cpi < 0.95 ? "risk" : cpi < 0.99 ? "watch" : "good",
    };
  });

  return { job_summary: summary, cost_trend: trend, change_orders: coRows, crew_hours: crew, field_reports: fieldReports, rfis: rfis.slice(0, 20) };
}

export function isoDay(base: Date, offsetDays: number) {
  const d = new Date(base.getTime() + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function countRows(ds: Datasets) {
  return Object.values(ds).reduce((t, rows) => t + rows.length, 0);
}
