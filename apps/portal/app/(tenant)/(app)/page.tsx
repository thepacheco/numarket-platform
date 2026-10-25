import type { Metadata } from "next";
import Link from "next/link";
import { resolveRange, type Block } from "@numarket/blocks";
import { BlockView, type BlockContext } from "@numarket/blocks/react";
import { withTenant } from "@numarket/db";
import { vocabFor } from "@numarket/db/demo/vocab";
import { getHomeLayout, listActionItems, listDashboards, listEntries, listFlags, listReports, listReviews, listSources } from "@numarket/db/repo/workspace";
import AskBox from "@/components/AskBox";
import { asOfMonth, Shown, viewModes } from "@/components/Dashboard";
import Icon from "@/components/Icon";
import SolidIcon from "@/components/solids/SolidIcon";
import { suggestedFor } from "@/lib/ask";
import { syncAlerts } from "@/lib/alertsSync";
import { ago, fmtTime, jobsInScope, reportVisible, workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { catalog, cleanLayout, defaultLayout } from "@/lib/home";
import { navFor } from "@/lib/nav";
import QbrGlance from "@/components/QbrGlance";
import { completeQuarters, priorQuarter, quarterGlance } from "@/lib/qbr";
import { pinViewLabel, splitPin, type PinView } from "@/lib/pinView";
import { askQuestion } from "../actions";

export const metadata: Metadata = { title: "Home" };

/* Each person's own landing page, kept calm: a greeting with what needs
   them, a box to ask anything, the numbers and charts they chose, the
   analyst's latest read, and (always) a map of where everything is. Field roles get
   a page built around today's entry. More panels can be added under
   Customize. */
export default async function Home() {
  const ctx = await requireTenant();
  const v = vocabFor(ctx.tenant.industry);
  const ws = await workspace(ctx);
  const alerts = await syncAlerts(ctx);
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
  /* a pin can carry the view it was pinned from (a job, a period, a table instead of a chart) */
  const withView = (list: string[], from: typeof cat.kpis) =>
    list.flatMap((e) => {
      const { id, view } = splitPin(e);
      const w = from.find((x) => x.id === id);
      return w ? [{ ...w, key: e, view }] : [];
    });
  const kpis = withView(layout.kpis, cat.kpis);
  const charts = withView(layout.charts, cat.charts);
  const has = (p: string) => layout.panels.includes(p);

  const updated = ws.snapshot ? new Date(ws.snapshot.published_at) : null;
  const range = resolveRange(asOfMonth(ws.snapshot?.published_at, tz), "12m");
  const c: BlockContext = { datasets: ws.snapshot?.datasets ?? {}, scope: ctx.scope, eq: {}, range, defs: ws.defs, updated: updated ? ago(updated) : "" };
  const jobs = jobsInScope(ws.snapshot?.datasets, ctx);
  const jobName = (code: string) => jobs.find((j) => j.code === code)?.name;
  /* the view a pin was saved with, checked again against what this person may see */
  const pinned = (w: { block: Block; view: PinView | null }) => {
    const v = w.view;
    if (!v) return { cx: c, mode: undefined, label: "" };
    const job = v.job && jobName(v.job) ? v.job : undefined;
    const cx: BlockContext = { ...c, eq: { job }, range: resolveRange(asOfMonth(ws.snapshot?.published_at, tz), v.range ?? "12m", v.from, v.to, v.cmp) };
    const mode = v.as && viewModes(w.block).includes(v.as) ? v.as : undefined;
    return { cx, mode, label: pinViewLabel({ ...v, job }, jobName) };
  };
  const unhealthy = data.sources.filter((s) => s.status !== "healthy");
  const review = data.reviews[0];
  /* leaders see every open action item; everyone else sees their own */
  const openActions = data.actions.filter((a) => a.status !== "done" && a.reviewId === review?.id && (leader || a.owner === ctx.user.name));
  const pendingMine = data.mine.filter((e) => e.status === "pending").length;
  const fieldRole = !ctx.can("dashboard.view") && ctx.can("input.submit");
  const fieldScreen = v.industry === "services" ? "time-entry" : "daily-field-report";
  const firing = alerts.rules.filter((r) => r.active && (alerts.firing.get(r.id)?.length ?? 0) > 0);

  /* the "needs you" list: things that wait on a person, most urgent first */
  const needs = [
    ...data.flags.slice(0, 2).map((f) => ({ key: `f${f.id}`, icon: "flag", tone: f.severity === "urgent" ? "risk" : "watch", title: f.title, sub: f.question ?? "A data question to answer", href: "/flags" })),
    ...(unhealthy.length ? [{ key: "src", icon: "plug", tone: "risk", title: `${unhealthy.length} ${unhealthy.length === 1 ? "source needs" : "sources need"} reconnecting`, sub: unhealthy.map((s) => s.name).join(", "), href: "/sources" }] : []),
    ...(firing.length ? [{ key: "alerts", icon: "bell", tone: "watch", title: `${firing.length} of your alerts ${firing.length === 1 ? "has" : "have"} something to show`, sub: firing.map((r) => alerts.firing.get(r.id)![0].title).slice(0, 2).join(" · "), href: "/alerts" }] : []),
    ...openActions.slice(0, 2).map((a) => ({ key: `a${a.idx}`, icon: "check", tone: a.status === "in_progress" ? "info" : "brand", title: a.title, sub: `Action item · ${a.owner} · due ${a.due}`, href: "/reviews/actions" })),
    ...(pendingMine ? [{ key: "pending", icon: "clock", tone: "info", title: `${pendingMine} of your ${pendingMine === 1 ? "entry goes" : "entries go"} in at the next update`, sub: `Next update ${fmtTime(ws.nextUpdate, tz)}`, href: "/inputs" }] : []),
  ].slice(0, 6);

  const sections = navFor(ctx);

  return (
    <>
      <section className="bento home-hero">
        <div className="card hero-greet c-7">
          <div className="hero-top">
            <span className="date-chip">
              <Icon name="calendar" /> {today}
            </span>
            <Link href="/home/customize" className="icon-btn" aria-label="Customize your Home page" data-tip="Choose what's on your Home page">
              <Icon name="grid" />
            </Link>
          </div>
          <h1>
            {greet}, {first}.
          </h1>
          <p className="hero-sub">
            {updated ? `Your data updated ${ago(updated)}; next update ${fmtTime(ws.nextUpdate, tz)}.` : "Your data hasn't had its first update yet."}{" "}
            {has("attention") && (needs.length ? `${needs.length} ${needs.length === 1 ? "thing needs" : "things need"} you.` : "Nothing needs you right now.")}
          </p>
          {has("attention") && needs.length > 0 && (
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
          )}
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
                  <Icon name="scan" /> Scan a paper form
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </section>

      {kpis.length > 0 && ws.snapshot && (
        <div className="dash-row kpis home-kpis" style={{ ["--cols" as string]: Math.min(4, kpis.length) }}>
          {kpis.map((w) => {
            const p = pinned(w);
            return (
              <div key={w.key} className="pv-wrap">
                <BlockView block={{ ...w.block, span: 1 }} c={p.cx} />
                {p.label && <span className="pv-chip">{p.label}</span>}
              </div>
            );
          })}
        </div>
      )}

      <div className="bento home-main">
        {charts.map((w, i) => {
          const p = pinned(w);
          return (
          <div key={w.key} className={`pv-wrap ${charts.length === 1 || (charts.length % 2 === 1 && i === charts.length - 1) ? "c-12" : "c-6"}`}>
            {p.mode ? <Shown b={{ ...w.block, span: 1 }} mode={p.mode} c={p.cx} /> : <BlockView block={{ ...w.block, span: 1 }} c={p.cx} />}
            {p.label && <span className="pv-chip">{p.label}</span>}
          </div>
          );
        })}

        {has("review") && review && (
          <section className="card c-12 analyst-card">
            <div className="panel-h">
              <h2>
                <span className="analyst-dot" aria-hidden="true">
                  {review.analyst
                    .split(",")[0]
                    .split(" ")
                    .map((w) => w[0])
                    .join("")}
                </span>
                {review.analyst.split(",")[0]}, your analyst: {review.title.replace(/ review$/, "")}
              </h2>
              <Link href={`/reviews/${review.id}`}>Read the review</Link>
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

        {has("qbr") && ws.snapshot && !ctx.scope && ctx.can("dashboard.view") && ctx.tenant.products.includes("insight") && (() => {
          const q = completeQuarters(asOfMonth(ws.snapshot.published_at, tz))[0];
          return (
            <section className="card c-12">
              <div className="panel-h">
                <h2>The quarter at a glance</h2>
                <Link href={`/reviews/qbr?q=${q.key}`}>Open the QBR pack</Link>
              </div>
              <QbrGlance rows={quarterGlance(ws.snapshot.datasets, v, q)} current={q.label} prior={priorQuarter(q).label} />
            </section>
          );
        })()}

        {has("entries") && (
          <section className="card c-6">
            <div className="panel-h">
              <h2>Your entries</h2>
              <Link href="/inputs">Enter data</Link>
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
          <section className="card c-6">
            <div className="panel-h">
              <h2>Status reports</h2>
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

        {/* always last: the map of the menu, by what each part is for */}
        <section className="card c-12 guide">
          <div className="panel-h">
            <h2>What&apos;s where</h2>
            <span className="small muted">Everything in the menu, by what it&apos;s for</span>
          </div>
          <div className="guide-grid">
            {sections.map((s) => (
              <div key={s.product} className={`guide-tile p-${s.product} ${s.owned ? "" : "unowned"}`}>
                <div className="guide-h">
                  <SolidIcon kind={s.product} size={18} muted={!s.owned} />
                  <div>
                    <b>{s.tagline}</b>
                    <span className="small muted">{s.name}</span>
                  </div>
                </div>
                <p className="small">{s.short}</p>
                <div className="guide-links">
                  {s.items.map((i) => (
                    <Link key={i.href} href={i.href} data-tip={i.tip}>
                      {i.locked ? "Not in your plan: see what it adds" : i.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
