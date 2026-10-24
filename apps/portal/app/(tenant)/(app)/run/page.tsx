import type { Metadata } from "next";
import Link from "next/link";
import type { DataReportDef } from "@numarket/blocks";
import { withTenant } from "@numarket/db";
import { listDataReports, listSavedViews } from "@numarket/db/repo/workspace";
import Icon from "@/components/Icon";
import { requireTenant } from "@/lib/guard";
import HubNav from "@/components/HubNav";

export const metadata: Metadata = { title: "Run a report" };

export default async function RunReports() {
  const ctx = await requireTenant("dashboard.view");
  const { all, views } = await withTenant(ctx.tenant.id, async (db) => ({ all: await listDataReports(db), views: await listSavedViews(db, ctx.user.id) }), { userId: ctx.user.id });
  const list = all.filter((r) => !(ctx.scope && (r.definition as DataReportDef).wholeCompany));
  const titles = Object.fromEntries(list.map((r) => [r.slug, r.title]));
  const myViews = views.filter((v) => titles[v.report_slug]);
  const cats = [...new Set(list.map((r) => r.category))];
  return (
    <>
      <HubNav hub="reports" current="/run" ctx={ctx} />
      <div className="page-head">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Run a report</h1>
          <p>Lists of your data you can run any time: pick the period, filter, find, and group it, save the view for next time, and download it as a spreadsheet or PDF.</p>
        </div>
      </div>
      {myViews.length > 0 && (
        <section style={{ marginBottom: 22 }}>
          <h2 className="section-h">Saved views</h2>
          <div className="grid-3">
            {myViews.map((sv) => (
              <Link key={sv.id} href={`/run/${sv.report_slug}?${new URLSearchParams(sv.params).toString()}`} className="item">
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
                <Link key={r.slug} href={`/run/${r.slug}`} className="item">
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
    </>
  );
}
