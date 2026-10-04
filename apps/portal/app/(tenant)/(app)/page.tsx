import type { Metadata } from "next";
import Link from "next/link";
import type { DashboardLayout } from "@numarket/blocks";
import { withTenant } from "@numarket/db";
import { getDashboard, listEntries, listFlags, listReports, listSources } from "@numarket/db/repo/workspace";
import { DashboardView } from "@/components/Dashboard";
import Icon from "@/components/Icon";
import { ago, fmtDateTime, fmtTime, reportVisible, workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Home" };

/* Role-based landing (Spec §12.3): key numbers, what needs attention, your
   entries, and how fresh the data is. */
export default async function Home() {
  const ctx = await requireTenant();
  const ws = await workspace(ctx);
  const tz = ctx.tenant.timezone;
  const hour = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: tz }));
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const data = await withTenant(
    ctx.tenant.id,
    async (db) => ({
      portfolio: ctx.can("dashboard.view") ? await getDashboard(db, "portfolio") : null,
      flags: ctx.can("flags.view") ? (await listFlags(db)).filter((f) => f.status === "open" && (!ctx.scope || !f.job || ctx.scope.values.includes(f.job))) : [],
      mine: ctx.can("input.submit") ? await listEntries(db, { userId: ctx.user.id, limit: 5 }) : [],
      sources: ctx.can("sources.view") ? await listSources(db) : [],
      reports: ctx.can("report.view") ? (await listReports(db)).filter((r) => reportVisible(r.layout, ctx)) : [],
    }),
    { userId: ctx.user.id },
  );
  const firstRow = (data.portfolio?.layout as DashboardLayout | undefined)?.rows[0];
  const updated = ws.snapshot ? fmtDateTime(ws.snapshot.published_at, tz) : "";
  const unhealthy = data.sources.filter((s) => s.status !== "healthy");
  const contributorOnly = !ctx.can("dashboard.view") && ctx.can("input.submit");

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{ctx.tenant.name}</p>
          <h1>
            {greet}, {ctx.user.name.split(" ")[0]}.
          </h1>
          <p>{ctx.scope ? "Here's what's happening on your jobs." : "Here's what's happening across the company."}</p>
        </div>
        {ctx.can("dashboard.view") && (
          <Link href="/dashboards/portfolio" className="btn btn-secondary">
            Open the portfolio <Icon name="arrow" />
          </Link>
        )}
      </div>

      {contributorOnly && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2>Today&apos;s field report</h2>
          <p className="muted">Fill it in from the job site. It takes about a minute.</p>
          <Link href="/inputs/daily-field-report" className="btn btn-primary">
            Fill in the daily field report
          </Link>
        </div>
      )}

      {firstRow && ws.snapshot && (
        <div style={{ marginBottom: 16 }}>
          <DashboardView layout={{ rows: [firstRow] }} datasets={ws.snapshot.datasets} ctx={ctx} filters={{}} defs={ws.defs} updated={updated} showFilters={false} />
        </div>
      )}

      <div className="grid-3">
        {ctx.can("flags.view") && (
          <section className="card">
            <h2>Needs attention</h2>
            {data.flags.length ? (
              <ul className="list">
                {data.flags.slice(0, 3).map((f) => (
                  <li key={f.id} className="small">
                    <span className={`pill ${f.severity}`}>{f.severity === "urgent" ? "Urgent" : f.severity === "info" ? "FYI" : "Review"}</span> {f.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">Nothing waiting on you.</p>
            )}
            <p style={{ margin: "12px 0 0" }}>
              <Link href="/flags">See all flags</Link>
            </p>
          </section>
        )}

        {ctx.can("input.submit") && (
          <section className="card">
            <h2>Your entries</h2>
            {data.mine.length ? (
              <ul className="list">
                {data.mine.map((e) => (
                  <li key={e.id} className="small row" style={{ justifyContent: "space-between" }}>
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
            <p style={{ margin: "12px 0 0" }}>
              <Link href="/inputs">Go to input screens</Link>
            </p>
          </section>
        )}

        <section className="card">
          <h2>Your data</h2>
          <dl className="kv">
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
          {ctx.can("sources.view") && (
            <p style={{ margin: "12px 0 0" }}>
              <Link href="/sources">See sources</Link>
            </p>
          )}
        </section>
      </div>

      {data.reports.length > 0 && (
        <section style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 16, margin: "0 0 10px" }}>Reports</h2>
          <div className="grid-2">
            {data.reports.map((r) => (
              <Link key={r.slug} href={`/reports/${r.slug}`} className="item">
                <h3>{r.title}</h3>
                <p className="small muted" style={{ margin: "4px 0 0" }}>
                  {r.latest_version ? `Version ${r.latest_version}, published ${ago(r.latest_at!)}` : "Not published yet"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
