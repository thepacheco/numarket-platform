/* Limits by tier (Platform Build Spec §9.1, PROPOSED until Brandon confirms).
   The refresh schedule and the "Update now" limit are enforced on the server.
   Metering of real warehouse cost arrives with the worker (Stage B). */

export type Tier = "insight" | "operate" | "command";

export type TierLimits = {
  name: string;
  size: string;
  schedule: { label: string; hours: number[] | null; weekdaysOnly: boolean };
  updateNowPerDay: number;
  askQuestionsPerMonth: number | null;
  rowVolume: string;
  platformAllowance: string;
  alertRules: number | null;
  scheduledReports: number | null;
  sources: string;
  users: string;
};

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  insight: {
    name: "Insight",
    size: "Small",
    schedule: { label: "Daily, overnight", hours: [2], weekdaysOnly: false },
    updateNowPerDay: 2,
    askQuestionsPerMonth: 200,
    rowVolume: "Up to about 10 million rows",
    platformAllowance: "$400 / month",
    alertRules: 10,
    scheduledReports: 5,
    sources: "Up to 3",
    users: "Up to 15",
  },
  operate: {
    name: "Operate",
    size: "Mid",
    schedule: { label: "Hourly, 7 AM–7 PM on weekdays", hours: range(7, 19), weekdaysOnly: true },
    updateNowPerDay: 6,
    askQuestionsPerMonth: 1000,
    rowVolume: "Up to about 50 million rows",
    platformAllowance: "$800 / month",
    alertRules: 50,
    scheduledReports: 25,
    sources: "Up to 8",
    users: "Up to 50",
  },
  command: {
    name: "Command",
    size: "Large",
    schedule: { label: "Custom schedule", hours: range(6, 22), weekdaysOnly: false },
    updateNowPerDay: 24,
    askQuestionsPerMonth: null,
    rowVolume: "Scoped per client",
    platformAllowance: "Passed through at cost + 15%",
    alertRules: null,
    scheduledReports: null,
    sources: "9 or more",
    users: "50 or more",
  },
};

/* Demo workspaces get a looser manual limit so prospects can try it freely. */
export function updateNowLimit(tier: Tier, isDemo: boolean) {
  return isDemo ? 50 : TIER_LIMITS[tier].updateNowPerDay;
}

/** Local wall-clock parts of a date in a time zone. */
function zoned(d: Date, timeZone: string) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", weekday: "short" });
  const parts = Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]));
  return { hour: Number(parts.hour) % 24, weekday: parts.weekday as string, day: `${parts.year}-${parts.month}-${parts.day}` };
}

function isScheduled(d: Date, tier: Tier, timeZone: string) {
  const s = TIER_LIMITS[tier].schedule;
  const z = zoned(d, timeZone);
  if (s.weekdaysOnly && (z.weekday === "Sat" || z.weekday === "Sun")) return false;
  return s.hours ? s.hours.includes(z.hour) : false;
}

/** The next scheduled update strictly after `from`, on the hour. */
export function nextScheduledUpdate(tier: Tier, timeZone: string, from = new Date()): Date {
  const d = new Date(from);
  d.setUTCMinutes(0, 0, 0);
  for (let i = 1; i <= 24 * 8; i++) {
    const t = new Date(d.getTime() + i * 3600_000);
    if (isScheduled(t, tier, timeZone)) return t;
  }
  return new Date(d.getTime() + 24 * 3600_000);
}

/** The most recent scheduled update at or before `now`. */
export function lastScheduledUpdate(tier: Tier, timeZone: string, now = new Date()): Date | null {
  const d = new Date(now);
  d.setUTCMinutes(0, 0, 0);
  for (let i = 0; i <= 24 * 8; i++) {
    const t = new Date(d.getTime() - i * 3600_000);
    if (isScheduled(t, tier, timeZone)) return t;
  }
  return null;
}

export function localDay(d: Date, timeZone: string) {
  return zoned(d, timeZone).day;
}
