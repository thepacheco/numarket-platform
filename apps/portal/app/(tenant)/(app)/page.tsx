import type { Metadata } from "next";
import Link from "next/link";
import { resolveRange } from "@numarket/blocks";
import { BlockView, type BlockContext } from "@numarket/blocks/react";
import { withTenant } from "@numarket/db";
import { vocabFor } from "@numarket/db/demo/vocab";
import { getHomeLayout, listActionItems, listDashboards, listEntries, listFlags, listReports, listReviews, listSources } from "@numarket/db/repo/workspace";
import AskBox from "@/components/AskBox";
import { asOfMonth } from "@/components/Dashboard";
import Icon from "@/components/Icon";
import { suggestedFor } from "@/lib/ask";
import { ago, fmtTime, reportVisible, workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { catalog, cleanLayout, defaultLayout } from "@/lib/home";
import { askQuestion } from "../actions";

export const metadata: Metadata = { title: "Home" };

/* Each person's own landing page, laid out as a bento grid: a greeting with
   what needs them today, an "ask anything" box, the key numbers they chose,
   their charts, and panels for the analyst's review, reports, and data
   freshness. Field roles get a page built around today's entry. */
export default async function Home() {
  const ctx = await requireTenant();
  const v = vocabFor(ctx.tenant.industry);
  const ws = await workspace(ctx);
  const tz = ctx.tenant.timezone;
  const hour = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: tz }));
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: tz });
  const first = ctx.user.name.split(" ")[0];
  const leader = !ctx.scope && ["owner", "admin", "viewer"].includes(ctx.role);

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
      actions: ctx.can("actions.view") && ctx.tenant.products.includes("insight") ? await listActionItems(db) : [],
    }),
    { userId: ctx.user.id },
  );
  const cat = catalog(data.dashboards, ctx);
  const layout = data.saved ? cleanLayout(data.saved, ctx, cat) : defaultLayout(ctx, cat);
  const kpis = layout.kpis.map((id) => cat.kpis.find((w) => w.id === id)!).filter(Boolean);
  const charts = layout.charts.map((id) => cat.charts.find((w) => w.id === id)!).filter(Boolean);
  const has = (p: string) => layout.panels.includes(p);

  const updated = ws.snapshot ? new Date(ws.snapshot.published_at) : null;
  const range = resolveRange(asOfMonth(ws.snapshot?.published_at, tz), "12m");
  const c: BlockContext = { datasets: ws.snapshot?.datasets ?? {}, scope: ctx.scope, eq: {}, range, defs: ws.defs, updated: updated ? ago(updated) : "" };
  const unhealthy = data.sources.filter((s) => s.status !== "healthy");
  const review = data.reviews[0];
  /* leaders see every open action item; everyone else sees their own */
  const openActions = data.actions.filter((a) => a.status !== "done" && a.reviewId === review?.id && (leader || a.owner === ctx.user.name));
  const pendingMine = data.mine.filter((e) => e.status === "pending").length;
  const fieldRole = !ctx.can("dashboard.view") && ctx.can("input.submit");
  const fieldScreen = v.industry === "services" ? "time-entry" : "daily-field-report";

  /* the "needs you" list: things that wait on a person, most urgent first */
  const needs = [
    ...data.flags.slice(0, 3).map((f) => ({ key: `f${f.id}`, icon: "flag", tone: f.severity === "urgent" ? "risk" : "watch", title: f.title, sub: f.question ?? "A data question to answer", href: "/flags" })),
    ...openActions.slice(0, 3).map((a) => ({ key: `a${a.idx}`, icon: "check", tone: a.status === "in_progress" ? "info" : "brand", title: a.title, sub: `${a.owner} · due ${a.due}${a.status === "in_progress" ? " · in progress" : ""}`, href: "/reviews/actions" })),
    ...(pendingMine ? [{ key: "pending", icon: "clock", tone: "info", title: `${pendingMine} of your ${pendingMine === 1 ? "entry" : "entries"} go in at the next update`, sub: `Next update ${fmtTime(ws.nextUpdate, tz)}`, href: "/inputs" }] : []),
    ...(unhealthy.length ? [{ key: "src", icon: "plug", tone: "risk", title: `${unhealthy.length} ${unhealthy.length === 1 ? "source needs" : "sources need"} reconnecting`, sub: unhealthy.map((s) => s.name).join(", "), href: "/sources" }] : []),
  ];

  return (
    <>
      <section className="bento home-hero">
        <div className="card hero-greet c-7">
          <div className="hero-top">
            <span className="date-chip">
              <Icon name="calendar" /> {today}
            </span>
            <Link href="/home/customize" className="icon-btn" aria-label="Customize your Home page" title="Customize your Home page">
              <Icon name="grid" />
            </Link>
          </div>
          <p className="eyebrow">{ctx.tenant.name}</p>
          <h1>
            {greet}, {first}.
          </h1>
          <p className="hero-sub">{needs.length ? `${needs.length} ${needs.length === 1 ? "thing needs" : "things need"} you today.` : "Nothing needs you right now. Here's how things stand."}</p>
          <div className="hero-stats">
            {ctx.can("flags.view") && (
              <Link href="/flags" className="hero-stat">
                <b className="tnum">{ws.openFlags}</b>
                <span>data {ws.openFlags === 1 ? "flag" : "flags"} to answer</span>
              </Link>
            )}
            {review && (
              <Link href="/reviews/actions" className="hero-stat">
                <b className="tnum">{openActions.length}</b>
                <span>open action {openActions.length === 1 ? "item" : "items"}</span>
              </Link>
            )}
            <Link href={ctx.can("flags.view") ? "/health" : "/definitions"} className="hero-stat">
              <b>{updated ? fmtTime(updated, tz) : "—"}</b>
              <span>last data update · next {fmtTime(ws.nextUpdate, tz)}</span>
            </Link>
          </div>
        </div>

        {ctx.can("ask.use") ? (
          <div className="card hero-ask c-5">
            <h2>
              <Icon name="chat" /> Ask anything about your numbers
            </h2>
            <AskBox action={askQuestion} compact suggested={suggestedFor(v, !!ctx.scope).slice(0, 3)} defs={Object.fromEntries(Object.values(ws.defs).map((d) => [d.name, d.means]))} placeholder={`e.g. Which ${v.jobs} are over budget?`} />
          </div>
        ) : fieldRole ? (
          <div className="card hero-action c-5">
            <p className="eyebrow">Today</p>
            <h2>{v.FieldReport}</h2>
            <p className="muted">{v.industry === "services" ? "Log today's hours against your projects. It takes about a minute." : "Fill it in from the job site. It takes about a minute."}</p>
            <div className="row">
              <Link href={`/inputs/${fieldScreen}`} className="btn btn-primary">
                Fill in the {v.fieldReport}
              </Link>
              {ctx.tenant.products.includes("engineering") && (
                <Link href="/apps/paper-intake" className="btn btn-secondary">
                  <Icon name="upload" /> Scan a paper form
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </section>

      {kpis.length > 0 && ws.snapshot && (
        <div className="dash-row kpis home-kpis" style={{ ["--cols" as string]: Math.min(4, kpis.length) }}>
          {kpis.map((w) => (
            <BlockView key={w.id} block={{ ...w.block, span: 1 }} c={c} />
          ))}
        </div>
      )}

      <div className="bento home-main">
        {has("attention") && (
          <section className="card c-5 needs">
            <div className="panel-h">
              <h2>Needs you</h2>
              {needs.length > 0 && <span className="pill">{needs.length}</span>}
            </div>
            {needs.length ? (
              <ul className="needs-list">
                {needs.map((x) => (
                  <li key={x.key}>
                    <Link href={x.href}>
                      <span className={`needs-ico tone-${x.tone}`}>
                        <Icon name={x.icon} />
                      </span>
                      <span className="needs-text">
                        <b>{x.title}</b>
                        <span>{x.sub}</span>
                      </span>
                      <Icon name="arrow" className="needs-go" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-note">
                <Icon name="check" /> You&apos;re all caught up.
              </p>
            )}
          </section>
        )}

        {charts.slice(0, 1).map((w) => (
          <div key={w.id} className={has("attention") ? "c-7" : "c-6"}>
            <BlockView block={{ ...w.block, span: 1 }} c={c} />
          </div>
        ))}

        {has("review") && review && (
          <section className="card c-7 analyst-card">
            <div className="panel-h">
              <h2>
                <span className="analyst-dot" aria-hidden="true">
                  {review.analyst
                    .split(",")[0]
                    .split(" ")
                    .map((w) => w[0])
                    .join("")}
                </span>
                {review.analyst.split(",")[0]}&apos;s {review.title.replace(/ review$/, "")} review
              </h2>
              <Link href={`/reviews/${review.id}`}>Read it</Link>
            </div>
            <p className="review-summary">{review.content.summary}</p>
            <div className="mini-changes">
              {review.content.changed.slice(0, 3).map((ch) => (
                <div key={ch.metric}>
                  <span className="small muted">{ch.metric}</span>
                  <b className="tnum">{ch.value}</b>
                  <span className="small">{ch.change}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {charts.slice(1).map((w) => (
          <div key={w.id} className="c-5">
            <BlockView block={{ ...w.block, span: 1 }} c={c} />
          </div>
        ))}

        {has("entries") && (
          <section className="card c-5">
            <div className="panel-h">
              <h2>Your entries</h2>
              <Link href="/inputs">Input screens</Link>
            </div>
            {data.mine.length ? (
              <ul className="list small">
                {data.mine.map((e) => (
                  <li key={e.id} className="row" style={{ justifyContent: "space-between" }}>
                    <span>
                      {e.screen_slug === fieldScreen ? v.FieldReport : v.ChangeOrder} · {ago(e.created_at)}
                    </span>
                    <span className={`pill ${e.status}`}>{e.status === "pending" ? "Next update" : "In dashboards"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-note">You haven&apos;t entered anything yet.</p>
            )}
          </section>
        )}

        {has("reports") && data.reports.length > 0 && (
          <section className="card c-4">
            <div className="panel-h">
              <h2>Reports</h2>
              <Link href="/reports">All reports</Link>
            </div>
            <ul className="list small">
              {data.reports.slice(0, 4).map((r) => (
                <li key={r.slug}>
                  <Link href={`/reports/${r.slug}`}>{r.title}</Link>
                  <div className="muted">{r.latest_version ? `Version ${r.latest_version}, ${ago(r.latest_at!)}` : "Draft ready to publish"}</div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {has("freshness") && (
          <section className="card c-3 fresh-card">
            <h2>Your data</h2>
            <p className="fresh-big">
              <span className="pulse-dot" aria-hidden="true" /> {updated ? ago(updated) : "Not yet"}
            </p>
            <dl className="kv small">
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
      </div>
    </>
  );
}
