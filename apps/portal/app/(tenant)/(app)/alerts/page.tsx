import type { Metadata } from "next";
import Link from "next/link";
import { withTenant } from "@numarket/db";
import { vocabFor } from "@numarket/db/demo/vocab";
import { listNotifications } from "@numarket/db/repo/workspace";
import ActionForm, { Submit } from "@/components/ActionForm";
import AlertForm from "@/components/AlertForm";
import HubNav from "@/components/HubNav";
import Icon from "@/components/Icon";
import { ALERT_KINDS, kindInfo } from "@/lib/alerts";
import { syncAlerts, whoFor } from "@/lib/alertsSync";
import { ago } from "@/lib/data";
import { emailConfigured } from "@/lib/email";
import { requireTenant } from "@/lib/guard";
import { addAlert, changeAlert, markAlertsRead } from "../../actions";

export const metadata: Metadata = { title: "Alerts and emails" };

/* Each person's own alerts: what to be told about, checked at every update,
   shown on the bell, and emailed if they ask. Plus the Monday summary. */
export default async function Alerts() {
  const ctx = await requireTenant("alert.manage_own");
  const v = vocabFor(ctx.tenant.industry);
  const { rules, firing, unread } = await syncAlerts(ctx);
  const notes = await withTenant(ctx.tenant.id, (db) => listNotifications(db, ctx.user.id, 25), { userId: ctx.user.id });
  const who = whoFor(ctx);
  const hasSummary = rules.some((r) => r.kind === "weekly_summary");
  const choices = ALERT_KINDS.filter((k) => k.allowed(who) && !(k.kind === "weekly_summary" && hasSummary)).map((k) => ({ kind: k.kind, label: k.label(v), about: k.describe({ id: "", kind: k.kind, params: k.param ? { [k.param.key]: k.param.default } : {}, email: true, active: true }, v), param: k.param }));
  const emailNote = ctx.tenant.isDemo
    ? "This is a demo, so no emails are sent. Use “Preview the email” to see exactly what would arrive."
    : emailConfigured()
      ? `Emails go to ${ctx.user.email}, once per alert, the morning after an update finds it.`
      : "Email delivery isn't switched on for this workspace yet; until it is, alerts show here and on the bell.";

  return (
    <>
      <HubNav hub="reports" current="/alerts" ctx={ctx} />
      <div className="page-head">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Alerts and emails</h1>
          <p>Tell me when something needs attention, and send me a summary every Monday. Every update is checked against your alerts; nobody has to watch the dashboards.</p>
        </div>
      </div>

      <div className="alerts-layout">
        <section className="stack">
          <h2 className="section-h">Your alerts</h2>
          {rules.length === 0 && <p className="empty-note">No alerts yet. Add one on the right; the Monday summary is a good start.</p>}
          {rules.map((r) => {
            const info = kindInfo(r.kind);
            if (!info) return null;
            const f = firing.get(r.id) ?? [];
            const summary = r.kind === "weekly_summary";
            return (
              <article key={r.id} className={`card alert-rule ${r.active ? "" : "paused"}`}>
                <div className="alert-rule-h">
                  <span className={`needs-ico ${summary ? "tone-info" : f.length ? "tone-risk" : "tone-brand"}`}>
                    <Icon name={summary ? "mail" : "bell"} />
                  </span>
                  <div>
                    <b>{info.label(v)}</b>
                    <div className="small muted">{info.describe(r, v)}</div>
                  </div>
                  <span className={`pill ${!r.active ? "" : summary ? "info" : f.length ? "risk" : "good"}`}>{!r.active ? "Paused" : summary ? "Mondays, 7 AM" : f.length ? `${f.length} now` : "All clear"}</span>
                </div>
                {r.active && f.length > 0 && (
                  <ul className="needs-list alert-firing">
                    {f.slice(0, 4).map((x) => (
                      <li key={x.key}>
                        <Link href={x.link}>
                          <span className="needs-text">
                            <b>{x.title}</b>
                            <span>{x.body}</span>
                          </span>
                          <Icon name="chevron" className="needs-go" />
                        </Link>
                      </li>
                    ))}
                    {f.length > 4 && <li className="small muted">and {f.length - 4} more</li>}
                  </ul>
                )}
                <div className="alert-rule-foot">
                  <span className="small muted">
                    <Icon name="mail" /> {r.email ? "Email on" : "Email off"}
                  </span>
                  <span className="grow" />
                  <Link className="btn btn-ghost btn-sm" href={`/alerts/preview?rule=${r.id}`}>
                    Preview the email
                  </Link>
                  {(
                    [
                      [r.email ? "email-off" : "email-on", r.email ? "Turn email off" : "Turn email on"],
                      [r.active ? "pause" : "resume", r.active ? "Pause" : "Resume"],
                      ["remove", "Remove"],
                    ] as const
                  ).map(([intent, label]) => (
                    <ActionForm key={intent} action={changeAlert} className="inline-form">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="intent" value={intent} />
                      <Submit className="btn btn-ghost btn-sm">{label}</Submit>
                    </ActionForm>
                  ))}
                </div>
              </article>
            );
          })}

          <div className="row" style={{ justifyContent: "space-between", marginTop: 10 }}>
            <h2 className="section-h" style={{ margin: 0 }}>
              Recent alerts {unread > 0 && <span className="nav-count">{unread} new</span>}
            </h2>
            {unread > 0 && (
              <ActionForm action={markAlertsRead} className="inline-form">
                <Submit className="btn btn-ghost btn-sm">Mark all read</Submit>
              </ActionForm>
            )}
          </div>
          {notes.length === 0 ? (
            <p className="empty-note small">Nothing yet. When an alert finds something, it shows up here and on the bell.</p>
          ) : (
            <ul className="card note-list">
              {notes.map((n) => (
                <li key={n.id} className={n.read_at ? "" : "unread"}>
                  <Link href={n.link ?? "/alerts"}>
                    <b>{n.title}</b>
                    <span className="small muted">{n.body}</span>
                  </Link>
                  <span className="small muted nowrap">
                    {ago(n.created_at)}
                    {n.email_status === "sent" ? " · emailed" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="card stack alerts-add">
          <h2>
            <Icon name="plus" /> Add an alert
          </h2>
          {choices.length ? <AlertForm action={addAlert} choices={choices} emailNote={emailNote} /> : <p className="small muted">You have every alert your role can set.</p>}
        </aside>
      </div>
    </>
  );
}
