import Link from "next/link";
import { RANGE_OPTIONS, resolveRange, validYm, visibleRows, type DashboardLayout, type Datasets, type Page, type RangeSel } from "@numarket/blocks";
import { BlockView, type BlockContext, type Defs } from "@numarket/blocks/react";
import type { TenantContext } from "@numarket/auth";
import AutoSubmitSelect from "./AutoSubmitSelect";

/* A dashboard: page tabs, a filter bar (date range, job), and rows of
   building blocks. Scope and filters are applied on the server before
   anything is drawn. Filters are plain links and GET forms. */

export type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? undefined;

export type DashState = { page: Page; range: RangeSel | null; job: string | undefined; jobs: { v: string; l: string }[] };

export function dashState(layout: DashboardLayout, datasets: Datasets, ctx: TenantContext, params: Params, asOfMonth: string): DashState {
  const page = layout.pages.find((p) => p.slug === one(params.page)) ?? layout.pages[0];
  const range = layout.filters.date ? resolveRange(asOfMonth, one(params.range), one(params.from), one(params.to)) : null;
  const jobs = layout.filters.job ? visibleRows(datasets, "job_summary", ctx.scope).map((r) => ({ v: String(r.job), l: String(r.name) })) : [];
  const j = one(params.job);
  return { page, range, job: j && jobs.some((x) => x.v === j) ? j : undefined, jobs };
}

export function stateQuery(s: DashState, override: Record<string, string | undefined> = {}) {
  const q = new URLSearchParams();
  const v: Record<string, string | undefined> = {
    page: s.page.slug,
    range: s.range?.key,
    from: s.range?.key === "custom" ? s.range.current.from : undefined,
    to: s.range?.key === "custom" ? s.range.current.to : undefined,
    job: s.job,
    ...override,
  };
  for (const [k, x] of Object.entries(v)) if (x) q.set(k, x);
  return q.toString();
}

export function DashboardView({ base, layout, datasets, ctx, state, defs, updated }: { base: string; layout: DashboardLayout; datasets: Datasets; ctx: TenantContext; state: DashState; defs: Defs; updated: string }) {
  const c: BlockContext = { datasets, scope: ctx.scope, eq: { job: state.job }, range: state.range, defs, updated };
  return (
    <>
      {layout.pages.length > 1 && (
        <nav className="tabs" aria-label="Dashboard pages">
          {layout.pages.map((p) => (
            <Link key={p.slug} href={`${base}?${stateQuery(state, { page: p.slug })}`} aria-current={p.slug === state.page.slug ? "page" : undefined}>
              {p.title}
            </Link>
          ))}
        </nav>
      )}
      <FilterBar base={base} state={state} />
      <Rows rows={state.page.rows} c={c} />
    </>
  );
}

export function Rows({ rows, c }: { rows: Page["rows"]; c: BlockContext }) {
  return (
    <div className="dash">
      {rows.map((row, i) => {
        const kpis = row.every((b) => b.type === "kpi");
        return (
          <div className={`dash-row ${kpis ? "kpis" : ""}`} key={i} style={kpis ? { ["--cols" as string]: Math.min(4, row.length) } : undefined}>
            {row.map((b, j) => (
              <BlockView key={j} block={b} c={c} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function FilterBar({ base, state }: { base: string; state: DashState }) {
  const r = state.range;
  if (!r && !state.jobs.length) return <div style={{ height: 16 }} />;
  return (
    <div className="filterbar">
      {r && (
        <div className="field">
          <span className="label" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>
            Period
          </span>
          <div className="range-seg" role="group" aria-label="Period">
            {RANGE_OPTIONS.filter((o) => o.key !== "custom").map((o) => (
              <Link key={o.key} href={`${base}?${stateQuery(state, { range: o.key, from: undefined, to: undefined })}`} aria-current={r.key === o.key ? "true" : undefined}>
                {o.label}
              </Link>
            ))}
          </div>
        </div>
      )}
      {r && (
        <details className="field" open={r.key === "custom"}>
          <summary className="btn btn-secondary btn-sm" style={{ listStyle: "none" }}>
            Custom range
          </summary>
          <form method="get" className="row" style={{ marginTop: 8, alignItems: "flex-end" }}>
            <input type="hidden" name="page" value={state.page.slug} />
            <input type="hidden" name="range" value="custom" />
            {state.job && <input type="hidden" name="job" value={state.job} />}
            <label className="field">
              <span>From</span>
              <input type="month" name="from" className="input" defaultValue={validYm(r.current.from) ? r.current.from : undefined} />
            </label>
            <label className="field">
              <span>To</span>
              <input type="month" name="to" className="input" defaultValue={validYm(r.current.to) ? r.current.to : undefined} />
            </label>
            <button className="btn btn-secondary btn-sm" type="submit">
              Apply
            </button>
          </form>
        </details>
      )}
      {state.jobs.length > 1 && (
        <form method="get" className="field">
          <input type="hidden" name="page" value={state.page.slug} />
          {r && <input type="hidden" name="range" value={r.key} />}
          {r?.key === "custom" && (
            <>
              <input type="hidden" name="from" value={r.current.from} />
              <input type="hidden" name="to" value={r.current.to} />
            </>
          )}
          <label htmlFor="f-job">Job</label>
          <AutoSubmitSelect id="f-job" name="job" defaultValue={state.job ?? ""} className="input">
            <option value="">All jobs</option>
            {state.jobs.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </AutoSubmitSelect>
          <noscript>
            <button className="btn btn-secondary btn-sm" type="submit">
              Apply
            </button>
          </noscript>
        </form>
      )}
      {r && (
        <span className="range-label">
          {r.label}
          {r.compareLabel ? ` · compared ${r.compareLabel.replace(/^vs /, "with ")}` : ""}
        </span>
      )}
    </div>
  );
}

/** The month the latest snapshot describes, like "2026-10". */
export function asOfMonth(publishedAt: Date | string | undefined, tz: string) {
  const d = publishedAt ? new Date(publishedAt) : new Date();
  return d.toLocaleDateString("en-CA", { timeZone: tz, year: "numeric", month: "2-digit" }).slice(0, 7);
}
