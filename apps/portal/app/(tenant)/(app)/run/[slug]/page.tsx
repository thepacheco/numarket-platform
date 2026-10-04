import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fmt, RANGE_OPTIONS, type DataReportDef } from "@numarket/blocks";
import { withTenant } from "@numarket/db";
import { getDataReport } from "@numarket/db/repo/workspace";
import AutoSubmitSelect from "@/components/AutoSubmitSelect";
import { asOfMonth, type Params } from "@/components/Dashboard";
import Icon from "@/components/Icon";
import { fmtDateTime, workspace } from "@/lib/data";
import { run, runQuery, runState } from "@/lib/dataReport";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Run a report" };
const isNum = (f?: string) => f === "money" || f === "num" || f === "pct" || f === "hours" || f === "dec2";

export default async function RunReport({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Params> }) {
  const ctx = await requireTenant("dashboard.view");
  const { slug } = await params;
  const r = await withTenant(ctx.tenant.id, (db) => getDataReport(db, slug));
  if (!r) notFound();
  const def = r.definition as DataReportDef;
  if (ctx.scope && def.wholeCompany) notFound();
  const ws = await workspace(ctx);
  const datasets = ws.snapshot?.datasets ?? {};
  const st = runState(def, datasets, ctx, await searchParams, asOfMonth(ws.snapshot?.published_at, ctx.tenant.timezone));
  const out = run(def, datasets, ctx, st);
  const canExport = ctx.can("dashboard.export") && ctx.policy.exportRoles.includes(ctx.role);
  const base = `/run/${slug}`;
  const shown = out.rows.slice(0, 500);
  return (
    <>
      <div className="dash-head">
        <div className="page-head" style={{ marginBottom: 0 }}>
          <div>
            <p className="eyebrow">
              <Link href="/run">Run a report</Link> · {r.category}
            </p>
            <h1>{r.title}</h1>
            <p>{r.description}</p>
          </div>
        </div>
        {canExport && (
          <div className="row">
            <a className="btn btn-secondary btn-sm" href={`${base}/export?${runQuery(st)}&format=csv`}>
              <Icon name="download" /> Spreadsheet (CSV)
            </a>
            <a className="btn btn-primary btn-sm" href={`${base}/export?${runQuery(st)}&format=pdf`}>
              <Icon name="pdf" /> PDF
            </a>
          </div>
        )}
      </div>

      <div className="filterbar">
        {def.groupings.length > 1 && (
          <div className="field">
            <span className="label" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>
              Show
            </span>
            <div className="range-seg" role="group" aria-label="Grouping">
              {def.groupings.map((g) => (
                <Link key={g.key} href={`${base}?${runQuery(st, { group: g.key })}`} aria-current={g.key === st.grouping.key ? "true" : undefined}>
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
            <input type="hidden" name="group" value={st.grouping.key} />
            {st.range && <input type="hidden" name="range" value={st.range.key} />}
            <label htmlFor="r-job">Job</label>
            <AutoSubmitSelect id="r-job" name="job" defaultValue={st.job ?? ""} className="input">
              <option value="">All jobs</option>
              {st.jobs.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </AutoSubmitSelect>
          </form>
        )}
        <span className="range-label">
          {st.range ? st.range.label : "As of today"} · {out.rows.length.toLocaleString("en-US")} rows · data updated {ws.snapshot ? fmtDateTime(ws.snapshot.published_at, ctx.tenant.timezone) : "—"}
        </span>
      </div>

      <div className="card">
        {shown.length ? (
          <div className="b-table-wrap">
            <table className="b-table">
              <thead>
                <tr>
                  {st.grouping.columns.map((c) => (
                    <th key={c.field} scope="col" className={isNum(c.format) ? "num" : ""}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((row, i) => (
                  <tr key={i}>
                    {st.grouping.columns.map((c) => (
                      <td key={c.field} className={isNum(c.format) ? "num tnum" : ""}>
                        {fmt(row[c.field], c.format, { full: c.format === "money" })}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {out.totals && (
                <tfoot>
                  <tr>
                    {st.grouping.columns.map((c, i) => (
                      <td key={c.field} className={isNum(c.format) ? "num tnum" : ""}>
                        {i === 0 ? "Total" : c.field in out.totals! ? fmt(out.totals![c.field], c.format, { full: c.format === "money" }) : ""}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          <p className="b-empty">Nothing for this period and job.</p>
        )}
        {out.rows.length > shown.length && <p className="small muted">Showing the first 500 rows. The download has all {out.rows.length.toLocaleString("en-US")}.</p>}
      </div>
    </>
  );
}
