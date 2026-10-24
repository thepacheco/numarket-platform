/* Sample companies for the demo workspaces (Summit Builders, construction;
   and through a different Profile, the professional services firm).

   In production, snapshots are published by the worker from the tenant's
   Snowflake serve tables. In the demo, buildDatasets() plays that role: it
   takes the fixed sample facts below plus every input-screen entry that has
   been applied, and returns the same dataset shapes a real publish would.

   26 months of history, so a 12-month view can be compared with the 12
   months before it. All names and figures are fictional sample data. */

export type JobFact = {
  code: string;
  name: string;
  customer: string;
  budget: number;
  pct: number;
  actual: number;
  rfis: number;
  /* months before the current month that the job started */
  startAgo: number;
};

export const SUMMIT_JOBS: JobFact[] = [
  { code: "108", name: "Terminal Expansion", customer: "Northgate Airport Authority", budget: 18_400_000, pct: 0.62, actual: 11_890_000, rfis: 14, startAgo: 20 },
  { code: "114", name: "Route 9 Bridge", customer: "Halden County DOT", budget: 9_600_000, pct: 0.48, actual: 4_920_000, rfis: 21, startAgo: 14 },
  { code: "121", name: "Data Center Shell", customer: "Ridgeline Data Partners", budget: 24_000_000, pct: 0.35, actual: 8_150_000, rfis: 9, startAgo: 9 },
  { code: "127", name: "Substation Upgrade", customer: "Piedmont Electric Co-op", budget: 6_200_000, pct: 0.71, actual: 4_310_000, rfis: 4, startAgo: 22 },
  { code: "133", name: "Medical Office Building", customer: "Magnolia Health Partners", budget: 12_800_000, pct: 0.22, actual: 2_790_000, rfis: 11, startAgo: 5 },
];

export const ACME_JOBS: JobFact[] = [
  { code: "A1", name: "Warehouse Retrofit", customer: "Acme internal", budget: 2_100_000, pct: 0.4, actual: 900_000, rfis: 3, startAgo: 8 },
  { code: "A2", name: "Office Fit-Out", customer: "Acme internal", budget: 850_000, pct: 0.75, actual: 610_000, rfis: 1, startAgo: 6 },
];

export const CAUSES = ["Design errors", "Owner changes", "Unforeseen conditions", "Weather", "Scope additions"] as const;
export const LABOR_RATE = 68;
export const MARKUP = 1.2;
export const HISTORY_MONTHS = 26;

/* Everything that makes the sample company look like its industry. The
   generator below is the same for every industry; only these facts change. */
export type Profile = {
  jobs: JobFact[];
  /* finished work that still shaped revenue and costs in earlier months */
  completed: { customer: string; value: number; startAgo: number; endAgo: number }[];
  /* customers billed outside the active jobs (service work, retainers) */
  otherCustomers: string[];
  otherRevenue: [number, number]; // base + random spread per customer per month
  otherCostShare: number;
  vendors: string[];
  vendorScale: number[];
  vendorSpendK: number[];
  apBase: [number, number, number];
  apLate: { i: number; bucket: number; amount: number }[];
  arLate: { job?: string; customer?: string; bucket: number; amount: number }[];
  causes: readonly string[];
  /* the one job with a problem the analyst points out */
  heavy: { job: string; causeIdx: number; factor: number };
  coShare: [number, number];
  laborRate: number;
  markup: number;
  hoursShare: number;
  dailyHours: [number, number];
  revenueAccounts: [string, string];
  /* three cost parts drawn as shares of job cost, plus the remainder; listed in P&L order */
  cogsParts: [string, number, number][];
  cogsRemainder: string;
  cogsOrder: string[];
  opex: readonly (readonly [string, number])[];
  cashStart: number;
  cashNoise: number;
  rfi: { prefix: string; start: number; subjects: string[]; ballInCourt: string[] };
  screens: { field: string; co: string };
  sample: { people: string[]; notes: string[]; base: number; step: number };
};

export const CONSTRUCTION_PROFILE: Profile = {
  jobs: SUMMIT_JOBS,
  completed: [
    { customer: "Harbor Logistics Group", value: 11_500_000, startAgo: 28, endAgo: 12 },
    { customer: "Elm Street Holdings", value: 6_400_000, startAgo: 30, endAgo: 15 },
    { customer: "Riverside Family Clinic", value: 3_100_000, startAgo: 19, endAgo: 6 },
    { customer: "Northpoint Medical Pavilion", value: 9_800_000, startAgo: 34, endAgo: 9 },
    { customer: "Lakeshore Distribution Center", value: 8_200_000, startAgo: 31, endAgo: 7 },
  ],
  otherCustomers: ["Oakline Property Group", "Westbrook Schools", "Cedar Point Retail", "Lakeside Church", "Grove Street Dental"],
  otherRevenue: [22_000, 30_000],
  otherCostShare: 0.58,
  vendors: ["Keystone Rebar", "Delta Mechanical", "Ridgeview Concrete", "BlueLine Steel", "Allied Equipment Rental", "Pinecrest Lumber", "Volt Electric Supply", "Metro Waste Services"],
  vendorScale: [1.4, 1.2, 1.1, 1.0, 0.6, 0.5, 0.45, 0.2],
  vendorSpendK: [210, 180, 160, 150, 70, 60, 55, 18],
  apBase: [260_000, 140_000, 38_000],
  apLate: [
    { i: 1, bucket: 3, amount: 31_500 },
    { i: 6, bucket: 4, amount: 7_800 },
  ],
  arLate: [
    { job: "114", bucket: 3, amount: 212_400 }, // Halden County DOT pays slowly
    { job: "133", bucket: 4, amount: 48_300 },
    { customer: "Cedar Point Retail", bucket: 3, amount: 18_900 },
  ],
  causes: CAUSES,
  heavy: { job: "114", causeIdx: 0, factor: 3.2 }, // design errors drive Route 9 Bridge
  coShare: [0.035, 0.03],
  laborRate: LABOR_RATE,
  markup: MARKUP,
  hoursShare: 0.33,
  dailyHours: [20, 60],
  revenueAccounts: ["Contract revenue", "Service and small projects"],
  cogsParts: [
    ["Direct labor", 0.31, 0.04],
    ["Materials", 0.27, 0.03],
    ["Equipment", 0.07, 0.02],
  ],
  cogsRemainder: "Subcontractors",
  cogsOrder: ["Direct labor", "Materials", "Subcontractors", "Equipment"],
  opex: [
    ["Office salaries", 205_000],
    ["Rent and facilities", 46_000],
    ["Insurance and bonding", 41_000],
    ["Vehicles and fuel", 27_000],
    ["Software and IT", 12_500],
    ["Other general and admin", 31_000],
  ],
  cashStart: 1_850_000,
  cashNoise: 120_000,
  rfi: {
    prefix: "RFI",
    start: 180,
    subjects: ["Rebar spacing at pier 3", "Door hardware spec", "Slab embed conflict", "Roof drain location", "Fire damper access", "Duct routing at grid C", "Anchor bolt pattern", "Curtain wall mullion size"],
    ballInCourt: ["Architect", "Structural engineer", "Owner", "MEP engineer"],
  },
  screens: { field: "daily-field-report", co: "change-order-log" },
  sample: { people: ["Luis Ortiz", "Kim Alvarez", "Ray Dunn"], notes: ["Steel delivery on time", "Waiting on RFI 207 response", "Pour scheduled Thursday", "Inspection passed"], base: 40, step: 12 },
};
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

/** Month labels like "2026-10", oldest first, ending with asOf's month. */
export function monthLabels(asOf: Date, n = HISTORY_MONTHS) {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function isoDay(base: Date, offsetDays: number) {
  return new Date(base.getTime() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

const dayLabel = (iso: string) => DAYS[(new Date(iso + "T12:00:00Z").getUTCDay() + 6) % 7] ?? "Fri";

/* S-curve weights over a job's active months; the current month counts only
   the part of the month that has passed. */
function spread(total: number, months: number, startIdx: number, endIdx: number, curFrac: number, jitter: () => number, shape: "s" | "ramp" = "s") {
  const out = Array(months).fill(0) as number[];
  const len = Math.max(1, endIdx - startIdx + 1);
  const first = Math.max(0, startIdx);
  let wsum = 0;
  const w: number[] = [];
  /* weights over the whole job; only months inside the window are returned */
  for (let i = startIdx; i <= endIdx; i++) {
    const p = (i - startIdx + 0.5) / len;
    /* finished jobs rise and fall; active jobs ramp up and hold */
    const base = shape === "s" ? Math.sin(p * Math.PI) * 0.85 + 0.35 : Math.min(1, 0.35 + p * 1.6);
    let x = base * (0.9 + jitter() * 0.2);
    if (i === months - 1) x *= curFrac;
    w.push(x);
    wsum += x;
  }
  for (let i = first; i <= endIdx; i++) out[i] = (total * w[i - startIdx]) / wsum;
  return out;
}

export function buildDatasets(jobsIn: JobFact[] | null, entries: Entry[], asOf: Date, p: Profile = CONSTRUCTION_PROFILE): Datasets {
  const jobs = jobsIn ?? p.jobs;
  const rand = rng(jobs.length * 7919 + jobs[0].code.charCodeAt(0));
  const months = monthLabels(asOf);
  const M = months.length;
  const cur = M - 1;
  const dim = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() + 1, 0)).getUTCDate();
  const curFrac = Math.max(0.08, asOf.getUTCDate() / dim);

  const sorted = [...entries].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const field = sorted.filter((e) => e.screen_slug === p.screens.field);
  const cos = sorted.filter((e) => e.screen_slug === p.screens.co);

  /* job state after entries (actual cost, percent complete) */
  const jobState = new Map(jobs.map((j) => [j.code, { ...j }]));
  for (const e of field) {
    const j = jobState.get(String(e.data.job));
    if (!j) continue;
    j.actual += Number(e.data.crew_hours) * p.laborRate;
    const pct = e.data.pct_complete;
    if (pct !== undefined && pct !== null && pct !== "") j.pct = Math.min(1, Math.max(0, Number(pct) / 100));
  }

  /* ---------- monthly earned vs. actual per active job ---------- */
  const costTrend: Record<string, unknown>[] = [];
  const jobEarned = new Map<string, number[]>();
  const jobActual = new Map<string, number[]>();
  for (const base of jobs) {
    const j = jobState.get(base.code)!;
    const start = Math.max(0, cur - base.startAgo);
    /* billing and cost follow the same S-curve, with a little monthly noise */
    const earned = spread(base.budget * base.pct, M, start, cur, curFrac, rand, "ramp");
    const ratio = base.actual / (base.budget * base.pct);
    const actual = earned.map((e) => e * ratio * (0.97 + rand() * 0.06));
    /* everything entered since the sample was taken lands in the current month */
    earned[cur] += j.budget * j.pct - base.budget * base.pct;
    actual[cur] += j.actual - base.actual;
    jobEarned.set(base.code, earned);
    jobActual.set(base.code, actual);
    for (let i = start; i < M; i++) costTrend.push({ job: base.code, job_name: base.name, month: months[i], earned: r0(earned[i]), actual: r0(actual[i]) });
  }

  /* ---------- revenue by customer (QuickBooks invoices) ---------- */
  const revenue: Record<string, unknown>[] = [];
  for (const base of jobs) {
    const earned = jobEarned.get(base.code)!;
    for (let i = 0; i < M; i++) if (earned[i] > 0) revenue.push({ month: months[i], customer: base.customer, job: base.code, job_name: base.name, amount: r0(earned[i] * p.markup) });
  }
  const completedCost = Array(M).fill(0) as number[];
  for (const c of p.completed) {
    const s = spread(c.value, M, cur - c.startAgo, cur - c.endAgo, 1, rand);
    for (let i = 0; i < M; i++) {
      if (s[i] > 0) {
        revenue.push({ month: months[i], customer: c.customer, amount: r0(s[i]) });
        completedCost[i] += s[i] / (p.markup * (0.97 + rand() * 0.06));
      }
    }
  }
  const serviceRev = Array(M).fill(0) as number[];
  for (let i = 0; i < M; i++) {
    const frac = i === cur ? curFrac : 1;
    for (const c of p.otherCustomers) {
      const amt = (p.otherRevenue[0] + rand() * p.otherRevenue[1]) * frac * (1 + (i / M) * 0.25);
      serviceRev[i] += amt;
      revenue.push({ month: months[i], customer: c, amount: r0(amt) });
    }
  }

  /* ---------- profit and loss ---------- */
  const pnl: Record<string, unknown>[] = [];
  const add = (i: number, section: string, account: string, amount: number, sort: number) => pnl.push({ month: months[i], section, account, amount: r0(amount), sort });
  const netByMonth: number[] = [];
  for (let i = 0; i < M; i++) {
    const frac = i === cur ? curFrac : 1;
    const contract = jobs.reduce((t, b) => t + jobEarned.get(b.code)![i] * p.markup, 0) + revenue.filter((r) => r.month === months[i] && p.completed.some((c) => c.customer === r.customer)).reduce((t, r) => t + Number(r.amount), 0);
    const jobCost = jobs.reduce((t, b) => t + jobActual.get(b.code)![i], 0) + completedCost[i] + serviceRev[i] * p.otherCostShare;
    /* entered hours are already in this month's job cost */
    const parts = new Map<string, number>();
    for (const [name, base, spreadW] of p.cogsParts) parts.set(name, jobCost * (base + rand() * spreadW));
    let remainder = jobCost;
    for (const v of parts.values()) remainder -= v;
    parts.set(p.cogsRemainder, remainder);
    add(i, "Revenue", p.revenueAccounts[0], contract, 1);
    add(i, "Revenue", p.revenueAccounts[1], serviceRev[i], 2);
    p.cogsOrder.forEach((name, k) => add(i, "Cost of goods sold", name, parts.get(name) ?? 0, 3 + k));
    let opexTotal = 0;
    p.opex.forEach(([name, base], k) => {
      const v = base * frac * (0.94 + rand() * 0.12) * (0.84 + (i / M) * 0.16);
      opexTotal += v;
      add(i, "Operating expenses", name, v, 3 + p.cogsOrder.length + k);
    });
    netByMonth.push(contract + serviceRev[i] - jobCost - opexTotal);
  }

  /* ---------- cash on hand (month-end) ---------- */
  const cash: Record<string, unknown>[] = [];
  let bal = p.cashStart;
  for (let i = 0; i < M; i++) {
    bal += netByMonth[i] * (0.3 + rand() * 0.3) + (i === cur ? 0 : (rand() - 0.5) * p.cashNoise);
    cash.push({ month: months[i], balance: r0(bal) });
  }

  /* ---------- receivables and payables aging (as of today) ---------- */
  const lastRev = (customer: string, back: number) => revenue.filter((r) => r.customer === customer && r.month === months[cur - back]).reduce((t, r) => t + Number(r.amount), 0);
  const arAging: Record<string, unknown>[] = [];
  const arCustomers = [...jobs.map((j) => ({ customer: j.customer, job: j.code as string | undefined, job_name: j.name })), ...p.otherCustomers.map((c) => ({ customer: c, job: undefined, job_name: undefined }))];
  for (const c of arCustomers) {
    const b = [lastRev(c.customer, 0) * 0.9 + lastRev(c.customer, 1) * 0.25, lastRev(c.customer, 1) * 0.55, lastRev(c.customer, 2) * 0.12, 0, 0];
    for (const late of p.arLate) if ((late.job && c.job === late.job) || (late.customer && c.customer === late.customer)) b[late.bucket] = late.amount;
    const row: Record<string, unknown> = { customer: c.customer, current: r0(b[0]), d1_30: r0(b[1]), d31_60: r0(b[2]), d61_90: r0(b[3]), d90p: r0(b[4]), total: r0(b.reduce((x, y) => x + y, 0)) };
    if (c.job) Object.assign(row, { job: c.job, job_name: c.job_name });
    arAging.push(row);
  }
  const apAging: Record<string, unknown>[] = p.vendors.map((v, k) => {
    const scale = p.vendorScale[k] ?? 0.2;
    const lateAmt = (bucket: number) => p.apLate.find((x) => x.i === k && x.bucket === bucket)?.amount ?? 0;
    const b = [p.apBase[0] * scale * (0.8 + rand() * 0.4), p.apBase[1] * scale * (0.7 + rand() * 0.5), p.apBase[2] * scale * rand(), lateAmt(3), lateAmt(4)];
    return { vendor: v, current: r0(b[0]), d1_30: r0(b[1]), d31_60: r0(b[2]), d61_90: r0(b[3]), d90p: r0(b[4]), total: r0(b.reduce((x, y) => x + y, 0)), due_7d: r0(b[0] * (0.25 + rand() * 0.2)) };
  });
  const vendorSpend: Record<string, unknown>[] = [];
  for (let i = 0; i < M; i++) {
    const frac = i === cur ? curFrac : 1;
    p.vendors.forEach((v, k) => vendorSpend.push({ month: months[i], vendor: v, amount: r0((p.vendorSpendK[k] ?? 10) * 1000 * frac * (0.75 + rand() * 0.5)) }));
  }

  /* ---------- change orders by month, job, and cause ---------- */
  const coRows: Record<string, unknown>[] = [];
  for (const j of jobs) {
    const start = Math.max(0, cur - j.startAgo);
    const weights = p.causes.map(() => 0.4 + rand());
    if (j.code === p.heavy.job) weights[p.heavy.causeIdx] *= p.heavy.factor;
    const wsum = weights.reduce((a, b) => a + b, 0);
    const total = j.budget * (p.coShare[0] + rand() * p.coShare[1]);
    for (let i = start; i < M; i++) {
      p.causes.forEach((c, k) => {
        if (rand() < 0.45) return;
        const amt = (total * (weights[k] / wsum)) / Math.max(1, (M - start) * 0.55);
        coRows.push({ month: months[i], job: j.code, job_name: j.name, cause: c, amount: r0(amt * (0.5 + rand())), count: 1 });
      });
    }
  }
  for (const e of cos) {
    const j = jobState.get(String(e.data.job));
    if (!j) continue;
    coRows.push({ month: months[cur], job: j.code, job_name: j.name, cause: String(e.data.cause), amount: Number(e.data.amount), count: 1 });
  }

  /* ---------- RFIs ---------- */
  const rfiTrend: Record<string, unknown>[] = [];
  for (const j of jobs) {
    const start = Math.max(0, cur - j.startAgo);
    for (let i = start; i < M; i++) {
      const opened = Math.round((2 + rand() * 7) * (i === cur ? curFrac : 1) * (j.code === p.heavy.job ? 1.6 : 1));
      const closed = Math.max(0, Math.round(opened * (0.65 + rand() * 0.4) - (j.code === p.heavy.job ? 1 : 0)));
      rfiTrend.push({ month: months[i], job: j.code, job_name: j.name, opened, closed });
    }
  }
  const { subjects, ballInCourt } = p.rfi;
  const rfis: Record<string, unknown>[] = [];
  let n = p.rfi.start;
  for (const j of jobs) {
    for (let i = 0; i < Math.min(4, j.rfis); i++) {
      const days = 3 + Math.floor(rand() * 30) + (j.code === p.heavy.job ? 12 : 0);
      rfis.push({ job: j.code, job_name: j.name, number: `${p.rfi.prefix} ${n++}`, subject: subjects[Math.floor(rand() * subjects.length)], days_open: days, opened: isoDay(asOf, -days), ball_in_court: ballInCourt[Math.floor(rand() * ballInCourt.length)] });
    }
  }
  rfis.sort((a, b) => Number(b.days_open) - Number(a.days_open));

  /* ---------- crew hours: this week, and by month ---------- */
  const hours = new Map<string, number>();
  for (const j of jobs) for (const d of DAYS) hours.set(`${j.code}|${d}`, r0(p.dailyHours[0] + rand() * p.dailyHours[1]));
  const monthly = new Map<string, number>();
  for (const j of jobs) {
    const actual = jobActual.get(j.code)!;
    for (let i = 0; i < M; i++) if (actual[i] > 0) monthly.set(`${j.code}|${months[i]}`, r0((actual[i] * p.hoursShare) / p.laborRate));
  }
  for (const e of field) {
    const key = `${e.data.job}|${dayLabel(String(e.data.date))}`;
    hours.set(key, (hours.get(key) ?? 0) + Number(e.data.crew_hours));
    const mk = `${e.data.job}|${String(e.data.date).slice(0, 7)}`;
    monthly.set(mk, (monthly.get(mk) ?? 0) + Number(e.data.crew_hours));
  }
  const crew = jobs.flatMap((j) =>
    DAYS.map((d) => {
      const h = hours.get(`${j.code}|${d}`) ?? 0;
      return { job: j.code, job_name: j.name, day: d, hours: h, labor_cost: r0(h * p.laborRate) };
    }),
  );
  const crewMonthly = [...monthly.entries()].map(([k, h]) => {
    const [code, month] = k.split("|");
    return { job: code, job_name: jobState.get(code)?.name ?? code, month, hours: h, labor_cost: r0(h * p.laborRate) };
  });

  /* ---------- field reports (newest first, bounded) ---------- */
  const sampleReports = jobs.slice(0, 4).map((j, i) => ({
    job: j.code,
    job_name: j.name,
    date: isoDay(asOf, -(i + 1)),
    crew_hours: p.sample.base + i * p.sample.step,
    by: p.sample.people[i % p.sample.people.length],
    note: p.sample.notes[i] ?? "",
    via: "Sample",
  }));
  const entered = [...field].reverse().map((e) => ({
    job: String(e.data.job),
    job_name: jobState.get(String(e.data.job))?.name ?? String(e.data.job),
    date: String(e.data.date),
    crew_hours: Number(e.data.crew_hours),
    by: e.created_by_name ?? "Team member",
    note: String(e.data.note ?? ""),
    via: "Portal form",
  }));
  const fieldReports = [...entered, ...sampleReports].slice(0, 25);

  /* ---------- job summary (to date) ---------- */
  const summary = jobs.map((base) => {
    const j = jobState.get(base.code)!;
    const earned = j.budget * j.pct;
    const cpi = earned / j.actual;
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
      change_orders: coRows.filter((r) => r.job === j.code).reduce((t, r) => t + Number(r.amount), 0),
      status: cpi < 0.95 ? "risk" : cpi < 0.99 ? "watch" : "good",
    };
  });

  return {
    job_summary: summary,
    cost_trend: costTrend,
    change_orders: coRows,
    rfis: rfis.slice(0, 20),
    rfi_trend: rfiTrend,
    crew_hours: crew,
    crew_hours_monthly: crewMonthly,
    field_reports: fieldReports,
    pnl,
    revenue_by_customer: revenue,
    cash,
    ar_aging: arAging,
    ap_aging: apAging,
    vendor_spend: vendorSpend,
  };
}

export function countRows(ds: Datasets) {
  return Object.values(ds).reduce((t, rows) => t + rows.length, 0);
}
