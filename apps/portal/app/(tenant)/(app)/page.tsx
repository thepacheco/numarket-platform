import type { Metadata } from "next";
import Link from "next/link";
import { resolveRange } from "@numarket/blocks";
import { BlockView, type BlockContext } from "@numarket/blocks/react";
import { withTenant } from "@numarket/db";
import { getHomeLayout, listDashboards, listEntries, listFlags, listReports, listReviews, listSources } from "@numarket/db/repo/workspace";
import { asOfMonth } from "@/components/Dashboard";
import Icon from "@/components/Icon";
import { ago, fmtDateTime, fmtTime, reportVisible, workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { catalog, cleanLayout, defaultLayout } from "@/lib/home";

export const metadata: Metadata = { title: "Home" };

/* Each person's own landing page: the key numbers and charts they chose,
   plus panels for flags, their entries, data freshness, reports, and the
   latest Insight Review. */
export default async function Home() {
  const ctx = await requireTenant();
  const ws = await workspace(ctx);
  const tz = ctx.tenant.timezone;
  const hour = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: tz }));
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const data = await withTenant(
    ctx.tenant.id,
    async (db) => ({
      dashboards: await listDashboards(db),
      saved: await getHomeLayout(db, ctx.user.id),
      flags: ctx.can("flags.view") ? (await listFlags(db)).filter((f) => f.status === "open" && (!ctx.scope || !f.job || ctx.scope.values.includes(f.job))) : [],
      mine: ctx.can("input.submit") ? await listEntries(db, { userId: ctx.user.id, limit: 5 }) : [],
      sources: ctx.can("sources.view") ? await listSources(db) : [],
      reports: ctx.can("report.view") ? (await listReports(db)).filter((r) => reportVisible(r.layout, ctx)) : [],
      reviews: ctx.can("actions.view") && ctx.tenant.products.includes("insight") ? await listReviews(db) : [],
    }),
    { userId: ctx.user.id },
  );
  const cat = catalog(data.dashboards, ctx);
  const layout = data.saved ? cleanLayout(data.saved, ctx, cat) : defaultLayout(ctx, cat);
  const kpis = layout.kpis.map((id) => cat.kpis.find((w) => w.id === id)!).filter(Boolean);
  const charts = layout.charts.map((id) => cat.charts.find((w) => w.id === id)!).filter(Boolean);
  const has = (p: string) => layout.panels.includes(p);

  const updated = ws.snapshot ? fmtDateTime(ws.snapshot.published_at, tz) : "";
  const range = resolveRange(asOfMonth(ws.snapshot?.published_at, tz), "12m");
  const c: BlockContext = { datasets: ws.snapshot?.datasets ?? {}, scope: ctx.scope, eq: {}, range, defs: ws.defs, updated };
  const unhealthy = data.sources.filter((s) => s.status !== "healthy");
  const review = data.reviews[0];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{ctx.tenant.name}</p>
          <h1>
            {greet}, {ctx.user.name.split(" ")[0]}.
          </h1>
          <p>
            {ctx.scope ? "Your jobs at a glance." : "The company at a glance."} {kpis.length > 0 && <span className="muted">Numbers cover {range.label} unless noted.</span>}
          </p>
        </div>
        <Link href="/home/customize" className="btn btn-secondary btn-sm">
          <Icon name="grid" /> Customize
        </Link>
      </div>

      {!ctx.can("dashboard.view") && ctx.can("input.submit") && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2>Today&apos;s field report</h2>
          <p className="muted">Fill it in from the job site. It takes about a minute.</p>
          <Link href="/inputs/daily-field-report" className="btn btn-primary">
            Fill in the daily field report
          </Link>
        </div>
      )}

      {kpis.length > 0 && ws.snapshot && (
        <div className="dash-row kpis" style={{ ["--cols" as string]: Math.min(4, kpis.length), marginBottom: 16 }}>
          {kpis.map((w) => (
            <BlockView key={w.id} block={{ ...w.block, span: 1 }} c={c} />
          ))}
        </div>
      )}

      {charts.length > 0 && ws.snapshot && (
        <div className="dash-row" style={{ ["--cols" as string]: charts.length === 1 ? 1 : 2, marginBottom: 16 }}>
          {charts.map((w) => (
            <BlockView key={w.id} block={{ ...w.block, span: 1 }} c={c} />
          ))}
        </div>
      )}

      <div className="home-grid">
        {has("review") && review && (
          <section className="card home-wide">
            <div className="panel-h">
              <h2>
                Latest Insight Review · {review.title.replace(/ review$/, "")}
              </h2>
              <Link href={`/reviews/${review.id}`}>Read it</Link>
            </div>
            <p style={{ margin: "0 0 10px" }}>{review.content.summary}</p>
            <ul className="list small">
              {review.content.recommendations.slice(0, 3).map((r) => (
                <li key={r.title} className="row" style={{ justifyContent: "space-between" }}>
                  <span>{r.title}</span>
                  <span className="muted">
                    {r.owner} · {r.due}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {has("attention") && (
          <section className="card">
            <div className="panel-h">
              <h2>Data that needs attention</h2>
              <Link href="/flags">All flags</Link>
            </div>
            {data.flags.length ? (
              <ul className="list small">
                {data.flags.slice(0, 4).map((f) => (
                  <li key={f.id}>
                    <span className={`pill ${f.severity}`}>{f.severity === "urgent" ? "Urgent" : f.severity === "info" ? "FYI" : "Review"}</span> {f.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">Nothing waiting.</p>
            )}
          </section>
        )}

        {has("entries") && (
          <section className="card">
            <div className="panel-h">
              <h2>Your entries</h2>
              <Link href="/inputs">Input screens</Link>
            </div>
            {data.mine.length ? (
              <ul className="list small">
                {data.mine.map((e) => (
                  <li key={e.id} className="row" style={{ justifyContent: "space-between" }}>
                    <span>
                      {e.screen_slug === "daily-field-report" ? "Field report" : "Change order"} · {ago(e.created_at)}
                    </span>
                    <span className={`pill ${e.status}`}>{e.status === "pending" ? "Next update" : "In dashboards"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">You haven&apos;t entered anything yet.</p>
            )}
          </section>
        )}

        {has("freshness") && (
          <section className="card">
            <div className="panel-h">
              <h2>Your data</h2>
              {ctx.can("sources.view") && <Link href="/sources">Sources</Link>}
            </div>
            <dl className="kv small">
              <dt>Last update</dt>
              <dd>{updated || "Not yet"}</dd>
              <dt>Next update</dt>
              <dd>{fmtTime(ws.nextUpdate, tz)}</dd>
              <dt>Waiting</dt>
              <dd>{ws.pending ? `${ws.pending} new ${ws.pending === 1 ? "entry" : "entries"}` : "Nothing"}</dd>
              {ctx.can("sources.view") && (
                <>
                  <dt>Sources</dt>
                  <dd>{unhealthy.length ? <span className="pill reconnect">{unhealthy.length} need attention</span> : <span className="pill healthy">All healthy</span>}</dd>
                </>
              )}
            </dl>
          </section>
        )}

        {has("reports") && data.reports.length > 0 && (
          <section className="card">
            <div className="panel-h">
              <h2>Reports</h2>
              <Link href="/reports">All reports</Link>
            </div>
            <ul className="list small">
              {data.reports.map((r) => (
                <li key={r.slug}>
                  <Link href={`/reports/${r.slug}`}>{r.title}</Link>
                  <div className="muted">{r.latest_version ? `Version ${r.latest_version}, ${ago(r.latest_at!)}` : "Not published yet"}</div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
