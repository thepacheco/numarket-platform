import Link from "next/link";
import { notFound } from "next/navigation";
import { tenantBySlug } from "@numarket/auth";
import { withTenant } from "@numarket/db";
import { getPolicy, listMembers } from "@numarket/db/repo/admin";
import { audit, listAudit } from "@numarket/db/repo/audit";
import { recentRuns } from "@numarket/db/repo/snapshots";
import { TIER_LIMITS } from "@numarket/metering";
import ActionForm, { Submit } from "@/components/ActionForm";
import { ago, fmtDateTime } from "@/lib/data";
import { requireStaff } from "@/lib/guard";
import { requestMeta } from "@/lib/request";
import { opsPublish, opsResetDemo } from "../../actions";

/* Support view of one tenant: configuration, people, runs, and audit. No
   business data (dashboards, entries) is shown here. Opening this page is
   recorded in the tenant's own audit log. */
export default async function OpsTenant({ params }: { params: Promise<{ slug: string }> }) {
  const staff = await requireStaff();
  const { slug } = await params;
  const t = await tenantBySlug(slug);
  if (!t) notFound();
  const meta = await requestMeta();
  const d = await withTenant(t.id, async (db) => {
    await audit(db, { tenantId: t.id, actorUserId: null, actorKind: "staff", action: "staff.view_tenant", target: staff.user.email, ip: meta.ip });
    return { members: await listMembers(db), policy: await getPolicy(db), runs: await recentRuns(db, 8), log: await listAudit(db, { limit: 15 }) };
  });
  const lim = TIER_LIMITS[t.tier];
  return (
    <main className="content" style={{ margin: "0 auto" }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            <Link href="/ops">Tenants</Link>
          </p>
          <h1>{t.name}</h1>
          <p>
            {lim.name} plan · {t.products.join(", ")} · {t.isDemo ? "demo workspace" : t.status}
          </p>
        </div>
        <div className="row">
          <ActionForm action={opsPublish}>
            <input type="hidden" name="slug" value={t.slug} />
            <Submit className="btn btn-secondary">Publish now</Submit>
          </ActionForm>
          {t.isDemo && staff.platformRole === "platform_admin" && (
            <ActionForm action={opsResetDemo}>
              <input type="hidden" name="slug" value={t.slug} />
              <Submit className="btn btn-primary">Reset demo</Submit>
            </ActionForm>
          )}
        </div>
      </div>
      <div className="grid-2" style={{ alignItems: "start" }}>
        <section className="card">
          <h2>People ({d.members.length})</h2>
          <table className="t">
            <tbody>
              {d.members.map((m) => (
                <tr key={m.user_id}>
                  <td>
                    {m.name}
                    <div className="small muted">{m.email}</div>
                  </td>
                  <td className="small">{m.role}</td>
                  <td className="small">{m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card">
          <h2>Security policy</h2>
          {d.policy && (
            <dl className="kv small">
              <dt>Sign-in</dt>
              <dd>{d.policy.allowed_methods.join(", ")}</dd>
              <dt>MFA required</dt>
              <dd>{d.policy.require_mfa ? "Yes" : "No"}</dd>
              <dt>Networks</dt>
              <dd>{d.policy.ip_allowlist.length ? d.policy.ip_allowlist.join(", ") : "Any"}</dd>
              <dt>Session</dt>
              <dd>
                {d.policy.session_hours} h, idle {d.policy.idle_minutes} min
              </dd>
            </dl>
          )}
          <h2 style={{ marginTop: 18 }}>Recent publishes</h2>
          <ul className="list small">
            {d.runs.map((r) => (
              <li key={r.id}>
                {fmtDateTime(r.started_at, t.timezone)} · {r.kind} · {r.entries_applied} entries · {r.rows_published} rows · {Number(r.snowflake_credits).toFixed(2)} credits
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Audit log (latest)</h2>
        <ul className="list small">
          {d.log.map((a) => (
            <li key={a.id}>
              {ago(a.at)} · {a.actor_name ?? a.actor_kind} · <code>{a.action}</code> {a.target ?? ""}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
