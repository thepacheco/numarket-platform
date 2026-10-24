import type { Metadata } from "next";
import Link from "next/link";
import type { DataReportDef } from "@numarket/blocks";
import { withTenant } from "@numarket/db";
import { listAlertRules, listDataReports, listSavedViews } from "@numarket/db/repo/workspace";
import HubNav from "@/components/HubNav";
import Icon from "@/components/Icon";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Explore" };

/* Explore is Foundation's window onto the clean data: start from a view of
   it, then filter, find, group, save, download, or set an alert. */
export default async function Explore() {
  const ctx = await requireTenant("dashboard.view");
  const { all, views, alerts } = await withTenant(
    ctx.tenant.id,
    async (db) => ({ all: await listDataReports(db), views: await listSavedViews(db, ctx.user.id), alerts: ctx.can("alert.manage_own") ? await listAlertRules(db, ctx.user.id) : [] }),
    { userId: ctx.user.id },
  );
  const list = all.filter((r) => !(ctx.scope && (r.definition as DataReportDef).wholeCompany));
  const titles = Object.fromEntries(list.map((r) => [r.slug, r.title]));
  const myViews = views.filter((v) => titles[v.report_slug]);
  const cats = [...new Set(list.map((r) => r.category))];

  return (
    <>
      <HubNav hub="explore" current="/explore" ctx={ctx} />
      <div className="page-head">
        <div>
          <p className="eyebrow">Foundation · your data</p>
          <h1>Explore</h1>
          <p>Look through any of your data. Start from one of the views below, then filter it, find things, and group it. Save the view for next time, download it, or ask to be told when something shows up.</p>
        </div>
      </div>

      <ol className="how-strip" style={{ marginBottom: 22 }}>
        <li>
          <span className="how-n">1</span>
          <div>
            <b>Pick a view</b>
            <span>{cats.join(", ")}: every row, straight from your clean data.</span>
          </div>
        </li>
        <li>
          <span className="how-n">2</span>
          <div>
            <b>Filter it</b>
            <span>By period, by {ctx.tenant.industry === "services" ? "project" : "job"}, by any column. Find any word or number.</span>
          </div>
        </li>
        <li>
          <span className="how-n">3</span>
          <div>
            <b>Keep it</b>
            <span>Save the view, download it, or get an alert when something new matches.</span>
          </div>
        </li>
      </ol>

      {myViews.length > 0 && (
        <section style={{ marginBottom: 22 }}>
          <h2 className="section-h">Your saved views</h2>
          <div className="grid-3">
            {myViews.map((sv) => (
              <Link key={sv.id} href={`/explore/${sv.report_slug}?${new URLSearchParams(sv.params).toString()}`} className="item">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <h3>{sv.name}</h3>
                  <Icon name={sv.shared ? "users" : "table"} />
                </div>
                <p className="small muted" style={{ margin: "4px 0 0" }}>
                  {titles[sv.report_slug]} · {sv.shared ? `shared by ${sv.user_id === ctx.user.id ? "you" : (sv.by_name ?? "a teammate")}` : "only you"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {cats.map((c) => (
        <section key={c} style={{ marginBottom: 22 }}>
          <h2 className="section-h">{c}</h2>
          <div className="grid-3">
            {list
              .filter((r) => r.category === c)
              .map((r) => (
                <Link key={r.slug} href={`/explore/${r.slug}`} className="item">
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <h3>{r.title}</h3>
                    <Icon name="table" />
                  </div>
                  <p className="small muted" style={{ margin: "4px 0 0" }}>
                    {r.description}
                  </p>
                </Link>
              ))}
          </div>
        </section>
      ))}

      <div className="bento">
        {ctx.can("alert.manage_own") && (
          <Link href="/alerts" className="card c-6 app-card">
            <span className="app-ico form-ico">
              <Icon name="bell" />
            </span>
            <h2>Alerts</h2>
            <p className="muted">
              {alerts.length ? `You have ${alerts.length} ${alerts.length === 1 ? "alert" : "alerts"}. ` : ""}Get told when a {ctx.tenant.industry === "services" ? "project" : "job"} goes over budget, money is late, or anything new matches a view you filtered, plus a Monday summary by email.
            </p>
          </Link>
        )}
        {ctx.can("sources.view") && (
          <Link href="/data" className="card c-6 app-card">
            <span className="app-ico form-ico">
              <Icon name="database" />
            </span>
            <h2>All tables</h2>
            <p className="muted">Every clean table in your private database, with what each row means and where it came from. Preview or download any of them, or connect Excel or Power BI.</p>
          </Link>
        )}
      </div>
    </>
  );
}
