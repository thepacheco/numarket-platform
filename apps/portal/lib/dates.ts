/* Small date and link helpers with no server dependencies, so tests and
   any page can use them. */

export function todayIn(tz: string) {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

/** A path inside this workspace (like "/dashboards/projects"), or null. Never another site. */
export function localLink(raw: string | undefined | null) {
  const v = (raw ?? "").trim();
  return /^\/[a-z0-9/_?=&.-]*$/i.test(v) && !v.startsWith("//") ? v.slice(0, 300) : null;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
/** An action item's due date ("Oct 27") as a date, using the review's period for the year.
 *  A month earlier than the review's means the next year (a December review due in January). */
export function dueDate(due: string, period: string): Date | null {
  const m = /^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})$/.exec(due.trim());
  const mi = m ? MONTHS.indexOf(m[1].toLowerCase()) : -1;
  if (!m || mi < 0) return null;
  const pm = Number(period.slice(5, 7)) - 1;
  const y = Number(period.slice(0, 4)) + (mi < pm ? 1 : 0);
  return new Date(Date.UTC(y, mi, Number(m[2])));
}
/** Whole days from today (in the workspace's time zone) to a date; negative when it's past. */
export function daysFromToday(d: Date, tz: string) {
  return Math.round((d.getTime() - new Date(`${todayIn(tz)}T00:00:00Z`).getTime()) / 86_400_000);
}

/** The first day of this month in the workspace's time zone (used for monthly allowances). */
export function monthStartIn(tz: string) {
  return new Date(`${todayIn(tz).slice(0, 7)}-01T00:00:00Z`);
}

/** The month the latest snapshot describes, like "2026-10". */
export function asOfMonth(publishedAt: Date | string | undefined, tz: string) {
  const d = publishedAt ? new Date(publishedAt) : new Date();
  return d.toLocaleDateString("en-CA", { timeZone: tz, year: "numeric", month: "2-digit" }).slice(0, 7);
}
