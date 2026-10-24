import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fmt, RANGE_OPTIONS, type DataReportDef } from "@numarket/blocks";
import { withTenant } from "@numarket/db";
import { vocabFor } from "@numarket/db/demo/vocab";
import { getDataReport, listSavedViews } from "@numarket/db/repo/workspace";
import ActionForm, { Submit } from "@/components/ActionForm";
import AddFilter from "@/components/AddFilter";
import AutoSubmitSelect from "@/components/AutoSubmitSelect";
import { asOfMonth, type Params } from "@/components/Dashboard";
import HubNav from "@/components/HubNav";
import Icon from "@/components/Icon";
import ViewAlertForm from "@/components/ViewAlertForm";
import { fmtDateTime, workspace } from "@/lib/data";
import { emailConfigured } from "@/lib/email";
import { describeView, isNumeric, OPS, run, runQuery, runState, whereParam } from "@/lib/explore";
import { requireTenant } from "@/lib/guard";
import { addViewAlert, deleteView, saveView } from "../../../actions";

export const metadata: Metadata = { title: "Explore" };

export default async function ExploreView({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Params> }) {
  const ctx = await requireTenant("dashboard.view");
  const { slug } = await params;
  const v = vocabFor(ctx.tenant.industry);
  const { r, views } = await withTenant(ctx.tenant.id, async (db) => ({ r: await getDataReport(db, slug), views: await listSavedViews(db, ctx.user.id, slug) }), { userId: ctx.user.id });
  if (!r) notFound();
  const def = r.definition as DataReportDef;
  if (ctx.scope && def.wholeCompany) notFound();
  const ws = await workspace(ctx);
  const datasets = ws.snapshot?.datasets ?? {};
  const st = runState(def, datasets, ctx.scope, await searchParams, asOfMonth(ws.snapshot?.published_at, ctx.tenant.timezone));
  const out = run(def, datasets, ctx.scope, st);
  const canExport = ctx.can("dashboard.export") && ctx.policy.exportRoles.includes(ctx.role);
  const base = `/explore/${slug}`;
  const shown = out.rows.slice(0, 500);
  const cols = st.grouping.columns;
  const keep = (over: Record<string, string | undefined> = {}) => Object.entries(Object.fromEntries(new URLSearchParams(runQuery(st, over))));
  const emailNote = ctx.tenant.isDemo ? "The demo doesn't send email." : emailConfigured() ? `Emails go to ${ctx.user.email}.` : "Email starts once your workspace's email is switched on.";

  return (
    <>
      <HubNav hub="explore" current="/explore" ctx={ctx} />
      <div className="dash-head">
        <div className="page-head" style={{ marginBottom: 0 }}>
          <div>
            <p className="eyebrow">
              <Link href="/explore">Explore</Link> · {r.category}
            </p>
            <h1>{r.title}</h1>
            <p>{r.description}</p>
          </div>
        </div>
        <div className="dash-actions">
          {canExport && (
            <>
              <a className="btn btn-secondary btn-sm" href={`${base}/export?${runQuery(st)}&format=csv`} data-tip="Download exactly what's on screen, every row, as a spreadsheet">
                <Icon name="download" /> CSV
              </a>
              <a className="btn btn-secondary btn-sm" href={`${base}/export?${runQuery(st)}&format=pdf`} data-tip="Download what's on screen as a PDF in your branding">
                <Icon name="pdf" /> PDF
              </a>
            </>
          )}
          {ctx.can("alert.manage_own") && (
            <ViewAlertForm action={addViewAlert} slug={slug} query={runQuery(st)} numeric={cols.filter((c) => isNumeric(c) && c.format !== "pct" && c.format !== "dec2").map((c) => ({ field: c.field, label: c.label }))} name={describeView(r.title, st).slice(0, 80)} emailNote={emailNote} />
          )}
        </div>
      </div>

      <div className="filterbar">
        {def.groupings.length > 1 && (
          <div className="field">
            <span className="label" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>
              Show
            </span>
            <div className="range-seg" role="group" aria-label="Grouping">
              {def.groupings.map((g) => (
                <Link key={g.key} href={`${base}?${runQuery(st, { group: g.key, w: undefined })}`} aria-current={g.key === st.grouping.key ? "true" : undefined}>
                  {g.label}
                </Link>
              ))}
            </div>
          </div>
        )}
        {st.range && (
          <div className="field">
            <span className="label" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>
              Period
            </span>
            <div className="range-seg" role="group" aria-label="Period">
              {RANGE_OPTIONS.filter((o) => o.key !== "custom").map((o) => (
                <Link key={o.key} href={`${base}?${runQuery(st, { range: o.key, from: undefined, to: undefined })}`} aria-current={st.range!.key === o.key ? "true" : undefined}>
                  {o.label}
                </Link>
              ))}
            </div>
          </div>
        )}
        {st.jobs.length > 1 && (
          <form method="get" className="field">
            {keep({ job: undefined }).map(([k, val]) => (
              <input key={k} type="hidden" name={k} value={val} />
            ))}
            <label htmlFor="r-job">{v.Job}</label>
            <AutoSubmitSelect id="r-job" name="job" defaultValue={st.job ?? ""} className="input">
              <option value="">All {v.jobs}</option>
              {st.jobs.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </AutoSubmitSelect>
          </form>
        )}
        <form method="get" className="field run-find" role="search">
          {keep({ find: undefined }).map(([k, val]) => (
            <input key={k} type="hidden" name={k} value={val} />
          ))}
          <label htmlFor="r-find">Find</label>
          <span className="run-find-box">
            <Icon name="search" />
            <input id="r-find" name="find" className="input" defaultValue={st.find ?? ""} placeholder="Any name, number, or word" maxLength={60} />
            {st.find && (
              <Link href={`${base}?${runQuery(st, { find: undefined })}`} aria-label="Clear" data-tip="Clear the find text">
                <Icon name="x" />
              </Link>
            )}
          </span>
        </form>
      </div>

      <div className="views-bar">
        {st.where.map((w, i) => (
          <span key={i} className="view-chip filter-chip">
            <span>
              <b>{cols.find((c) => c.field === w.field)?.label}</b> {OPS[w.op]} {w.value}
            </span>
            <Link href={`${base}?${runQuery(st, { w: whereParam(st.where.filter((_, j) => j !== i)) || undefined })}`} className="icon-btn" aria-label="Remove this filter" data-tip="Remove this filter">
              <Icon name="x" />
            </Link>
          </span>
        ))}
        <AddFilter columns={cols.map((c) => ({ field: c.field, label: c.label, numeric: isNumeric(c) }))} base={base} query={runQuery(st, { w: undefined })} where={whereParam(st.where)} />
        <span className="range-label">
          {st.range ? st.range.label : "As of today"} · {out.rows.length.toLocaleString("en-US")} {out.rows.length === 1 ? "row" : "rows"} · data updated {ws.snapshot ? fmtDateTime(ws.snapshot.published_at, ctx.tenant.timezone) : "—"}
        </span>
      </div>

      <div className="views-bar">
        <span className="small muted">Saved views</span>
        {views.length === 0 && <span className="small muted">· none yet</span>}
        {views.map((sv) => (
          <span key={sv.id} className="view-chip">
            <Link href={`${base}?${new URLSearchParams(sv.params).toString()}`} data-tip={sv.shared ? `Shared by ${sv.user_id === ctx.user.id ? "you" : (sv.by_name ?? "a teammate")}` : "Only you see this one"}>
              {sv.shared && <Icon name="users" />} {sv.name}
            </Link>
            {sv.user_id === ctx.user.id && (
              <ActionForm action={deleteView} className="view-del">
                <input type="hidden" name="id" value={sv.id} />
                <Submit className="icon-btn">
                  <Icon name="x" />
                  <span className="sr-only">Delete {sv.name}</span>
                </Submit>
              </ActionForm>
            )}
          </span>
        ))}
        <details className="view-save">
          <summary className="btn btn-ghost btn-sm">
            <Icon name="plus" /> Save this view
          </summary>
          <div className="view-pop card">
            <ActionForm action={saveView} className="stack" resetOnSuccess>
              <input type="hidden" name="slug" value={slug} />
              {keep().map(([k, val]) => (
                <input key={k} type="hidden" name={k} value={val} />
              ))}
              <div className="field">
                <label htmlFor="v-name">Name</label>
                <input id="v-name" name="name" className="input" required maxLength={80} placeholder={`e.g. ${st.grouping.label}, ${st.range?.label ?? "today"}`} />
              </div>
              {ctx.can("report.edit") && (
                <label className="row small" style={{ gap: 8 }}>
                  <input type="checkbox" name="shared" /> Share with my team
                </label>
              )}
              <p className="small muted" style={{ margin: 0 }}>
                Saves the grouping, period, {v.job}, find text, and filters. The numbers stay live: opening the view shows the latest data.
              </p>
              <div>
                <Submit>Save view</Submit>
              </div>
            </ActionForm>
          </div>
        </details>
      </div>

      <div className="card">
        {shown.length ? (
          <div className="b-table-wrap">
            <table className="b-table">
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th key={c.field} scope="col" className={isNumeric(c) ? "num" : ""}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((row, i) => (
                  <tr key={i}>
                    {cols.map((c) => (
                      <td key={c.field} className={isNumeric(c) ? "num tnum" : ""}>
                        {fmt(row[c.field], c.format, { full: c.format === "money" })}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {out.totals && (
                <tfoot>
                  <tr>
                    {cols.map((c, i) => (
                      <td key={c.field} className={isNumeric(c) ? "num tnum" : ""}>
                        {i === 0 ? "Total" : c.field in out.totals! ? fmt(out.totals![c.field], c.format, { full: c.format === "money" }) : ""}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          <p className="b-empty">{st.find || st.where.length ? "Nothing matches these filters for this period." : `Nothing for this period and ${v.job}.`}</p>
        )}
        {out.rows.length > shown.length && <p className="small muted">Showing the first 500 rows. The download has all {out.rows.length.toLocaleString("en-US")}.</p>}
      </div>
    </>
  );
}
