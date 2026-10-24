import "server-only";
import { cache } from "react";
import type { TenantContext } from "@numarket/auth";
import { withTenant, type Db } from "@numarket/db";
import { vocabFor } from "@numarket/db/demo/vocab";
import { listAlertRules, recordNotifications, unreadNotifications } from "@numarket/db/repo/workspace";
import { asOfMonth } from "@/components/Dashboard";
import { evaluate, type AlertRule, type Firing, type ViewDefs, type Who } from "./alerts";
import { workspace } from "./data";

/** The Explore views that view alerts refer to, by slug. */
export async function viewDefs(db: Db, rules: AlertRule[]): Promise<ViewDefs> {
  const slugs = [...new Set(rules.filter((r) => r.kind === "view" && r.params.slug).map((r) => r.params.slug!))];
  if (!slugs.length) return {};
  const rows = (await db.query<{ slug: string; title: string; definition: ViewDefs[string]["definition"] }>("select slug, title, definition from data_reports where slug = any($1)", [slugs])).rows;
  return Object.fromEntries(rows.map((r) => [r.slug, { title: r.title, definition: r.definition }]));
}

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
        const views = await viewDefs(db, rules);
        const asOf = asOfMonth(ws.snapshot.published_at, ctx.tenant.timezone);
        for (const r of rules) {
          const f = evaluate(r, ws.snapshot.datasets, whoFor(ctx), v, asOf, flags, views);
          firing.set(r.id, f);
          if (r.active && f.length) await recordNotifications(db, ctx.user.id, r.id, f);
        }
      }
      return { rules, firing, unread: await unreadNotifications(db, ctx.user.id) };
    },
    { userId: ctx.user.id },
  );
});
