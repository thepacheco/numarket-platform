import "server-only";
import { cache } from "react";
import { withTenant } from "@numarket/db";
import { getBranding } from "@numarket/db/repo/admin";
import { latestSnapshot, pendingEntryCount, publishSimulated, scopeRows, simulationAllowed } from "@numarket/db/repo/snapshots";
import { listDefinitions } from "@numarket/db/repo/workspace";
import { lastScheduledUpdate, nextScheduledUpdate } from "@numarket/metering";
import type { TenantContext } from "@numarket/auth";
import type { Defs } from "@numarket/blocks/react";

/* What every workspace page needs: the latest published snapshot, business
   definitions, branding, and the update schedule.

   Scheduled updates in the demo are simulated lazily: if entries are waiting
   and a scheduled update time has passed since the oldest one, the next page
   view publishes it. Real tenants are published by the worker (Stage B). */

export const workspace = cache(async (ctx: TenantContext) => {
  return withTenant(
    ctx.tenant.id,
    async (db) => {
      const pending0 = await pendingEntryCount(db);
      if (pending0.n > 0 && pending0.oldest && simulationAllowed(ctx.tenant.isDemo)) {
        const last = lastScheduledUpdate(ctx.tenant.tier, ctx.tenant.timezone);
        if (last && last > new Date(pending0.oldest)) await publishSimulated(db, ctx.tenant, "scheduled", null, last);
      }
      const snapshot = await latestSnapshot(db);
      const defRows = await listDefinitions(db);
      const branding = await getBranding(db);
      const pending = await pendingEntryCount(db);
      /* scoped users only count flags on their jobs (or not tied to a job) */
      const openFlags = (
        await db.query<{ n: number }>(
          "select count(*)::int as n from flags where status = 'open' and ($1::text[] is null or job is null or job = any($1))",
          [ctx.scope?.values ?? null],
        )
      ).rows[0].n;
      const defs: Defs = Object.fromEntries(defRows.map((d) => [d.key, { name: d.name, means: d.means, sources: d.sources, formula: d.formula }]));
      return {
        snapshot,
        defs,
        branding,
        pending: pending.n,
        openFlags,
        nextUpdate: nextScheduledUpdate(ctx.tenant.tier, ctx.tenant.timezone),
      };
    },
    { userId: ctx.user.id },
  );
});

/** Jobs this user may see, from the latest snapshot. */
export function jobsInScope(datasets: Record<string, Record<string, unknown>[]> | undefined, ctx: TenantContext) {
  return scopeRows(datasets?.job_summary, ctx.scope).map((r) => ({ code: String(r.job), name: String(r.name) }));
}

export function fmtTime(d: Date | string, tz: string) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
}

export function fmtDateTime(d: Date | string, tz: string) {
  const x = new Date(d);
  const sameDay = x.toLocaleDateString("en-US", { timeZone: tz }) === new Date().toLocaleDateString("en-US", { timeZone: tz });
  return sameDay ? `Today ${fmtTime(x, tz)}` : x.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz });
}

export function ago(d: Date | string) {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hr ago`;
  return `${Math.round(s / 86400)} days ago`;
}

export function todayIn(tz: string) {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

/** A report fixed to one job is shown only to people whose scope includes it;
 *  a company-wide report only to people who see the whole company. */
export function reportVisible(layout: { job?: string | null; wholeCompany?: boolean }, ctx: TenantContext) {
  if (!ctx.scope) return true;
  if (layout.wholeCompany) return false;
  return !layout.job || ctx.scope.values.includes(layout.job);
}
