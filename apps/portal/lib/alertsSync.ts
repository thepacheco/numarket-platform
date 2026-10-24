import "server-only";
import { cache } from "react";
import type { TenantContext } from "@numarket/auth";
import { withTenant } from "@numarket/db";
import { vocabFor } from "@numarket/db/demo/vocab";
import { listAlertRules, recordNotifications, unreadNotifications } from "@numarket/db/repo/workspace";
import { asOfMonth } from "@/components/Dashboard";
import { evaluate, type AlertRule, type Firing, type Who } from "./alerts";
import { workspace } from "./data";

export const whoFor = (ctx: TenantContext): Who => ({ scope: ctx.scope, wholeCompany: !ctx.scope && ctx.can("dashboard.view"), flags: ctx.can("flags.view") });

/* Check this person's alerts against the latest update, once per request:
   anything new becomes a notification (the bell), and the page gets what's
   firing for each rule. Email goes out from the daily job, not here. */
export const syncAlerts = cache(async (ctx: TenantContext) => {
  if (!ctx.can("alert.manage_own") && !ctx.can("alert.manage_all")) return { rules: [], firing: new Map<string, Firing[]>(), unread: 0 };
  const ws = await workspace(ctx);
  const v = vocabFor(ctx.tenant.industry);
  return withTenant(
    ctx.tenant.id,
    async (db) => {
      const rules = (await listAlertRules(db, ctx.user.id)) as unknown as AlertRule[];
      const firing = new Map<string, Firing[]>();
      if (ws.snapshot && rules.length) {
        const flags = rules.some((r) => r.kind === "flag_opened") ? (await db.query<{ id: string; title: string; job: string | null }>("select id, title, job from flags where status = 'open' order by created_at desc limit 50")).rows : [];
        const asOf = asOfMonth(ws.snapshot.published_at, ctx.tenant.timezone);
        for (const r of rules) {
          const f = evaluate(r, ws.snapshot.datasets, whoFor(ctx), v, asOf, flags);
          firing.set(r.id, f);
          if (r.active && f.length) await recordNotifications(db, ctx.user.id, r.id, f);
        }
      }
      return { rules, firing, unread: await unreadNotifications(db, ctx.user.id) };
    },
    { userId: ctx.user.id },
  );
});
