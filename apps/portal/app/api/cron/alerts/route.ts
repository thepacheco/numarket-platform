import { timingSafeEqual } from "node:crypto";
import { ROLE_PERMISSIONS, isRole } from "@numarket/auth";
import { withProvisioner } from "@numarket/db";
import { vocabFor } from "@numarket/db/demo/vocab";
import { latestSnapshot } from "@numarket/db/repo/snapshots";
import { recordNotifications, setEmailStatus } from "@numarket/db/repo/workspace";
import { asOfMonth } from "@/components/Dashboard";
import { evaluate, isoWeek, weeklySummary, type AlertRule, type Who } from "@/lib/alerts";
import { alertEmail, emailConfigured, sendEmail, summaryEmail } from "@/lib/email";

/* Daily, called by Vercel Cron with Authorization: Bearer <CRON_SECRET>.
   Checks every person's alerts in every live workspace against its latest
   update, records what's new, and emails it to the people who asked. On
   Mondays it also sends the Monday summaries. Demo workspaces never send. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  if (!secret || got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const tenants = await withProvisioner(async (db) => (await db.query<{ id: string; name: string; timezone: string; industry: string }>("select id, name, timezone, industry from tenants where not is_demo and status = 'active'")).rows);
  let fired = 0, emailed = 0;
  for (const t of tenants) {
    const r = await withProvisioner(
      async (db) => {
        const snap = await latestSnapshot(db);
        if (!snap) return { fired: 0, emailed: 0 };
        const v = vocabFor(t.industry);
        const rules = (
          await db.query<AlertRule & { user_id: string; email_to: string; role: string; scope_values: string[] | null }>(
            `select r.id, r.kind, r.params, r.email, r.active, r.user_id, u.email as email_to, m.role, m.scope_values
             from alert_rules r join users u on u.id = r.user_id
             join memberships m on m.user_id = r.user_id and m.tenant_id = r.tenant_id and m.status = 'active'
             where r.active`,
          )
        ).rows;
        if (!rules.length) return { fired: 0, emailed: 0 };
        const flags = (await db.query<{ id: string; title: string; job: string | null }>("select id, title, job from flags where status = 'open'")).rows;
        const b = (await db.query<{ display_name: string | null; primary_color: string | null }>("select display_name, primary_color from branding")).rows[0];
        const host = (await db.query<{ host: string }>("select host from tenant_hosts where tenant_id = $1 order by length(host) limit 1", [t.id])).rows[0]?.host;
        const brand = { name: b?.display_name ?? t.name, color: b?.primary_color ?? "#22577A", url: `https://${host ?? "app.numarket.us"}` };
        const asOf = asOfMonth(snap.published_at, t.timezone);
        const now = new Date();
        const monday = now.toLocaleDateString("en-US", { weekday: "long", timeZone: t.timezone }) === "Monday";
        const updated = new Date(snap.published_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: t.timezone });
        let f = 0, e = 0;
        for (const userId of new Set(rules.map((x) => x.user_id))) {
          const mine = rules.filter((x) => x.user_id === userId);
          const role = isRole(mine[0].role) ? ROLE_PERMISSIONS[mine[0].role] : new Set<string>();
          const scope = mine[0].scope_values ? { dimension: "job", values: mine[0].scope_values } : null;
          const who: Who = { scope, wholeCompany: !scope && role.has("dashboard.view"), flags: role.has("flags.view") };
          if (!role.has("alert.manage_own") && !role.has("alert.manage_all")) continue;
          const toEmail: { ids: string[]; items: ReturnType<typeof evaluate> } = { ids: [], items: [] };
          for (const rule of mine) {
            if (rule.kind === "weekly_summary") {
              if (!monday) continue;
              const s = weeklySummary(snap.datasets, who, v);
              const fresh = await recordNotifications(db, userId, rule.id, [{ key: `weekly:${isoWeek(now)}`, title: "Monday summary", body: s.headline, link: "/dashboards/projects" }]);
              f += fresh.length;
              if (fresh.length && rule.email) {
                const status = await sendEmail({ to: mine[0].email_to, ...summaryEmail(brand, s, v, updated) });
                await setEmailStatus(db, fresh.map((x) => x.id), status);
                if (status === "sent") e++;
              }
              continue;
            }
            const items = evaluate(rule, snap.datasets, who, v, asOf, flags);
            const fresh = await recordNotifications(db, userId, rule.id, items);
            f += fresh.length;
            if (fresh.length && rule.email) {
              toEmail.ids.push(...fresh.map((x) => x.id));
              toEmail.items.push(...items.filter((it) => fresh.some((x) => x.key === it.key)));
            }
          }
          /* one email per person per day, listing everything new */
          if (toEmail.items.length) {
            const status = await sendEmail({ to: mine[0].email_to, ...alertEmail(brand, toEmail.items.slice(0, 20)) });
            await setEmailStatus(db, toEmail.ids, status);
            if (status === "sent") e++;
          }
        }
        return { fired: f, emailed: e };
      },
      { tenantId: t.id },
    );
    fired += r.fired;
    emailed += r.emailed;
  }
  return Response.json({ tenants: tenants.length, fired, emailed, emailConfigured: emailConfigured() });
}
