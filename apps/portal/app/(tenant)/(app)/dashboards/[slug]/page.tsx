import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { DashboardLayout } from "@numarket/blocks";
import { can, isRole } from "@numarket/auth";
import { withTenant } from "@numarket/db";
import { listMembers } from "@numarket/db/repo/admin";
import { vocabFor } from "@numarket/db/demo/vocab";
import { dashboardForRole, getDashboard, getHomeLayout, listDashboards } from "@numarket/db/repo/workspace";
import AskBox from "@/components/AskBox";
import AskDrawer from "@/components/AskDrawer";
import { asOfMonth, dashState, DashboardView, stateQuery, type Params } from "@/components/Dashboard";
import Icon from "@/components/Icon";
import { suggestedFor } from "@/lib/ask";
import { fmtDateTime, workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { catalog, cleanLayout, defaultLayout } from "@/lib/home";
import { insightsFor } from "@/lib/insights";
import { pinBase } from "@/lib/pinView";
import { askQuestion, pinToHome, sendSnapshot } from "../../../actions";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Params> }) {
  const ctx = await requireTenant("dashboard.view");
  const v = vocabFor(ctx.tenant.industry);
  const { slug } = await params;
  const { dash, dashboards, saved, members } = await withTenant(
    ctx.tenant.id,
    async (db) => ({ dash: await getDashboard(db, slug), dashboards: await listDashboards(db), saved: await getHomeLayout(db, ctx.user.id), members: await listMembers(db) }),
    { userId: ctx.user.id },
  );
  if (!dash || !dashboardForRole(dash, ctx.role)) notFound();
  const layout = dash.layout as DashboardLayout;
  if (ctx.scope && layout.wholeCompany) notFound();
  const ws = await workspace(ctx);
  const datasets = ws.snapshot?.datasets ?? {};
  const state = dashState(layout, datasets, ctx, await searchParams, asOfMonth(ws.snapshot?.published_at, ctx.tenant.timezone));
  const updated = ws.snapshot ? fmtDateTime(ws.snapshot.published_at, ctx.tenant.timezone) : "";
  const canExport = ctx.can("dashboard.export") && ctx.policy.exportRoles.includes(ctx.role);
  const hasTables = state.page.rows.flat().some((b) => b.type === "table" || b.type === "statement");

  /* what's already on this person's Home, so the pins show their state */
  const cat = catalog(dashboards, ctx);
  const home = saved ? cleanLayout(saved, ctx, cat) : defaultLayout(ctx, cat);
  const pinned = new Set([...home.kpis, ...home.charts].map(pinBase));
  const kind = layout.wholeCompany ? "financials" : "projects";
  /* who can receive this view: people whose role shows dashboards and whose data scope covers it */
  const people = members
    .filter((m) => m.status === "active" && m.user_id !== ctx.user.id && isRole(m.role) && can(m.role, "dashboard.view") && dashboardForRole(dash, m.role))
    .filter((m) => !m.scope_values?.length || (!layout.wholeCompany && !!state.job && m.scope_values.includes(state.job)))
    .map((m) => ({ id: m.user_id, label: `${m.name}${m.title ? `, ${m.title}` : ""}` }));
  const insights = ws.snapshot ? insightsFor(kind, datasets, ctx.scope, state.range, v, state.job) : [];

  return (
    <>
      <div className="dash-head">
        <div className="page-head" style={{ marginBottom: 0 }}>
          <div>
            <p className="eyebrow">
              <Link href="/dashboards">Dashboards</Link>
            </p>
            <h1>{dash.title}</h1>
            <p>
              {dash.description}
              {layout.source ? <span className="dash-source"> · From {layout.source}</span> : null}
            </p>
          </div>
        </div>
        <div className="dash-actions">
          {ctx.can("requests.submit") && (
            <Link
              className="btn btn-secondary btn-sm"
              href={`/requests/new?${new URLSearchParams({ kind: "change", product: "workspace", link: `/dashboards/${slug}`, from: dash.title }).toString()}`}
              data-tip="Want a new page, chart, or number here? Describe it, sketch it from our blocks, and your analyst builds it."
            >
              <Icon name="plus" /> Request a change
            </Link>
          )}
          {canExport && hasTables && (
            <a className="btn btn-secondary btn-sm" href={`/dashboards/${slug}/export?${stateQuery(state)}`} data-tip="Download the tables on this page, with the filters you've set, as a CSV file for Excel">
              <Icon name="download" /> Export (CSV)
            </a>
          )}
          {ws.snapshot && ctx.can("ask.use") && (
            <AskDrawer title="Ask about this dashboard">
              <AskBox action={askQuestion} suggested={suggestedFor(v, !!ctx.scope, kind).slice(0, 4)} defs={Object.fromEntries(Object.values(ws.defs).map((d) => [d.name, d.means]))} placeholder={kind === "financials" ? "e.g. Who owes us money over 60 days?" : `e.g. Which ${v.jobs} are over budget?`} />
              <p className="small muted" style={{ margin: "12px 0 0" }}>
                Answers come from the same data as this dashboard, limited to what you&apos;re allowed to see. <Link href="/ask">See all your questions</Link>
              </p>
            </AskDrawer>
          )}
        </div>
      </div>
      {ws.snapshot ? (
        <DashboardView
          base={`/dashboards/${slug}`}
          layout={layout}
          datasets={datasets}
          ctx={ctx}
          state={state}
          defs={ws.defs}
          updated={updated}
          pins={{ pinned, action: pinToHome }}
          send={{ slug, people, rows: canExport, action: sendSnapshot }}
          before={
            insights.length > 0 ? (
              <section className="insights" aria-label="What changed">
                <div className="insights-h">
                  <span className="pill">
                    <Icon name="spark" /> What changed
                  </span>
                  <span className="small muted">Automatic, from this update · Pin any number or chart to your Home with its pin</span>
                </div>
                <div className="insights-row">
                  {insights.map((x) => (
                    <div key={x.title} className={`insight tone-${x.tone}`}>
                      <span className="insight-ico">
                        <Icon name={x.icon} />
                      </span>
                      <div>
                        <b>{x.title}</b>
                        <p>{x.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null
          }
        />
      ) : (
        <p className="notice">No data has been published yet.</p>
      )}
    </>
  );
}
