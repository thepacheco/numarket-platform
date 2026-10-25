import Link from "next/link";
import { blockId, fmt, fmtChange, isDated, RANGE_OPTIONS, resolveRange, statementData, validYm, visibleRows, type Block, type DashboardLayout, type Datasets, type Page, type RangeSel } from "@numarket/blocks";
import { BlockAs, BlockView, type BlockContext, type Defs } from "@numarket/blocks/react";
import type { TenantContext } from "@numarket/auth";
import { vocabFor } from "@numarket/db/demo/vocab";
import type { ActionResult } from "./ActionForm";
import AutoSubmitSelect from "./AutoSubmitSelect";
import ChartTools from "./ChartTools";
import Icon from "./Icon";
import MatrixTable, { type MatrixLine } from "./MatrixTable";
import PinButton from "./PinButton";
import { rowMatch, rowsHref } from "@/lib/drill";
import { pinViewLabel, pinViewQuery, type PinView } from "@/lib/pinView";

export type Pins = { pinned: Set<string>; action: (p: ActionResult | null, f: FormData) => Promise<ActionResult> };
const pinnable = (b: Block) => ["kpi", "trend", "columns", "bar", "stacked"].includes(b.type);

/* A dashboard: page tabs, a filter bar (date range, job), and rows of
   building blocks. Scope and filters are applied on the server before
   anything is drawn. Filters are plain links and GET forms. */

export type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? undefined;

/* "as" is one chart shown another way: its block id and the view (line, bars, table, heat) */
export type ViewMode = "line" | "bars" | "table" | "heat";
export type DashState = { page: Page; range: RangeSel | null; job: string | undefined; jobs: { v: string; l: string }[]; as: { id: string; mode: ViewMode } | null };

const MODES: ViewMode[] = ["line", "bars", "table", "heat"];
/** The ways a chart can be shown; the first is how it was built. */
export function viewModes(b: Block): ViewMode[] {
  if (b.type === "trend") return ["line", "bars", "table", "heat"];
  if (b.type === "columns") return ["bars", "line", "table", "heat"];
  if (b.type === "bar") return ["bars", "table"];
  if (b.type === "stacked") return ["bars", "table", "heat"];
  return [];
}
const MODE_LABEL: Record<ViewMode, string> = { line: "Line", bars: "Bars", table: "Table", heat: "Heat map" };

export function dashState(layout: DashboardLayout, datasets: Datasets, ctx: TenantContext, params: Params, asOfMonth: string): DashState {
  const page = layout.pages.find((p) => p.slug === one(params.page)) ?? layout.pages[0];
  const range = layout.filters.date ? resolveRange(asOfMonth, one(params.range), one(params.from), one(params.to), one(params.cmp)) : null;
  const jobs = layout.filters.job ? visibleRows(datasets, "job_summary", ctx.scope).map((r) => ({ v: String(r.job), l: String(r.name) })) : [];
  const j = one(params.job);
  const [asId, asMode] = (one(params.as) ?? "").split("~");
  const as = asId && MODES.includes(asMode as ViewMode) ? { id: asId.slice(0, 120), mode: asMode as ViewMode } : null;
  return { page, range, job: j && jobs.some((x) => x.v === j) ? j : undefined, jobs, as };
}

export function stateQuery(s: DashState, override: Record<string, string | undefined> = {}) {
  const q = new URLSearchParams();
  const v: Record<string, string | undefined> = {
    page: s.page.slug,
    range: s.range?.key,
    from: s.range?.key === "custom" ? s.range.current.from : undefined,
    to: s.range?.key === "custom" ? s.range.current.to : undefined,
    job: s.job,
    cmp: s.range?.compare === "year" && s.range.key !== "ytd" ? "year" : undefined,
    as: s.as ? `${s.as.id}~${s.as.mode}` : undefined,
    ...override,
  };
  for (const [k, x] of Object.entries(v)) if (x) q.set(k, x);
  return q.toString();
}

export function DashboardView({ base, layout, datasets, ctx, state, defs, updated, pins, before }: { base: string; layout: DashboardLayout; datasets: Datasets; ctx: TenantContext; state: DashState; defs: Defs; updated: string; pins?: Pins; before?: React.ReactNode }) {
  const c: BlockContext = {
    datasets,
    scope: ctx.scope,
    eq: { job: state.job },
    range: state.range,
    defs,
    updated,
    /* a job in a table opens this dashboard for that job; other rows open their own rows in Explore */
    rowHref: (dataset, row) =>
      dataset === "job_summary" && row.job != null && state.jobs.some((j) => j.v === String(row.job)) && !state.job
        ? `${base}?${stateQuery(state, { job: String(row.job) })}`
        : rowMatch(dataset, row)
          ? rowsHref(dataset, state, rowMatch(dataset, row))
          : null,
  };
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
      <FilterBar base={base} state={state} ctx={ctx} />
      {before}
      <Rows rows={state.page.rows} c={c} pins={pins} drill={{ base, state }} />
    </>
  );
}

/* A statement (P&L) as a matrix that opens and closes, with each account linked to its rows. */
function Matrix({ block, c, state }: { block: Extract<Block, { type: "statement" }>; c: BlockContext; state?: DashState }) {
  const dated = isDated(c.datasets, block.dataset);
  const rows = visibleRows(c.datasets, block.dataset, c.scope, { eq: c.eq, range: dated ? c.range?.current : null });
  const prior = dated && c.range?.prior ? visibleRows(c.datasets, block.dataset, c.scope, { eq: c.eq, range: c.range.prior }) : null;
  const lines: MatrixLine[] = statementData(block, rows, prior).map((l) => ({
    label: l.label,
    kind: l.kind,
    current: fmt(l.current, "money", { full: true }),
    prior: fmt(l.prior, "money", { full: true }),
    change: l.prior ? (fmtChange((l.current - l.prior) / Math.abs(l.prior), "money") ?? "—") : "—",
    share: l.share === null ? "—" : fmt(l.share, "pct"),
  }));
  const f = { range: c.range, job: state?.job };
  const accountHref = Object.fromEntries(lines.filter((l) => l.kind === "line").map((l) => [l.label, rowsHref(block.dataset, f, { field: "account", value: l.label }) ?? ""]));
  return (
    <MatrixTable
      title={block.title}
      caption={c.range ? c.range.label : null}
      lines={lines}
      hasPrior={!!prior}
      priorLabel={c.range?.compare === "year" ? "Same period last year" : "Prior period"}
      accountHref={accountHref}
    />
  );
}

/* The same chart, shown another way (line, bars, table, heat map). */
export function Shown({ b, mode, c }: { b: Block; mode: ViewMode; c: BlockContext }) {
  if (mode === "table" || mode === "heat") return <BlockAs block={b} c={c} as={mode} />;
  if (b.type === "trend" && mode === "bars") return <BlockView block={{ ...b, type: "columns" }} c={c} />;
  if (b.type === "columns" && mode === "line") return <BlockView block={{ ...b, type: "trend" }} c={c} />;
  return <BlockView block={b} c={c} />;
}

/** What's on screen, if it isn't the full view: offered when pinning to Home. */
function pinView(state: DashState, mode?: ViewMode) {
  const v: PinView = {};
  if (state.job) v.job = state.job;
  if (state.range && state.range.key !== "12m") {
    v.range = state.range.key;
    if (state.range.key === "custom") Object.assign(v, { from: state.range.current.from, to: state.range.current.to });
  }
  if (state.range?.compare === "year" && state.range.key !== "ytd") v.cmp = "year";
  if (mode) v.as = mode;
  const query = pinViewQuery(v);
  return query ? { query, label: pinViewLabel(v, (code) => state.jobs.find((j) => j.v === code)?.l) } : undefined;
}

export function Rows({ rows, c, pins, drill }: { rows: Page["rows"]; c: BlockContext; pins?: Pins; drill?: { base: string; state: DashState } }) {
  return (
    <div className="dash">
      {rows.map((row, i) => {
        const kpis = row.every((b) => b.type === "kpi");
        return (
          <div className={`dash-row ${kpis ? "kpis" : ""}`} key={i} style={kpis ? { ["--cols" as string]: Math.min(4, row.length) } : undefined}>
            {row.map((b, j) => {
              if (b.type === "statement") return <Matrix key={j} block={b} c={c} state={drill?.state} />;
              if (!(pins && pinnable(b))) return <BlockView key={j} block={b} c={c} />;
              const id = blockId(b);
              const modes = viewModes(b);
              const mode = drill?.state.as?.id === id && modes.includes(drill.state.as.mode) ? drill.state.as.mode : modes[0];
              const rowsLink = drill ? rowsHref(b.dataset, drill.state) : null;
              return (
                <div key={j} className={`pin-wrap span-${b.span ?? 1}`} id={id.replace(/[^a-z0-9-]/gi, "-")}>
                  <Shown b={b} mode={mode} c={c} />
                  <div className="b-tools">
                    {drill && modes.length > 1 && (
                      <span className="see-as" role="group" aria-label={`See ${b.title} as`}>
                        {modes.map((m) => (
                          <Link key={m} href={`${drill.base}?${stateQuery(drill.state, { as: m === modes[0] ? undefined : `${id}~${m}` })}#${id.replace(/[^a-z0-9-]/gi, "-")}`} aria-current={m === mode ? "true" : undefined} scroll={false}>
                            {MODE_LABEL[m]}
                          </Link>
                        ))}
                      </span>
                    )}
                    {rowsLink && (
                      <Link href={rowsLink} className="b-rows" data-tip="See every row behind this, in Explore, with the same period and filters">
                        <Icon name="table" /> Rows
                      </Link>
                    )}
                  </div>
                  <ChartTools title={b.title} />
                  <PinButton id={id} pinned={pins.pinned.has(id)} action={pins.action} view={drill ? pinView(drill.state, mode !== modes[0] ? mode : undefined) : undefined} />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function FilterBar({ base, state, ctx }: { base: string; state: DashState; ctx: TenantContext }) {
  const v = vocabFor(ctx.tenant.industry);
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
            {r.compare === "year" && <input type="hidden" name="cmp" value="year" />}
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
      {r && r.key !== "ytd" && (
        <div className="field">
          <span className="label" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>
            Compare with
          </span>
          <div className="range-seg" role="group" aria-label="Compare with">
            <Link href={`${base}?${stateQuery(state, { cmp: undefined })}`} aria-current={r.compare !== "year" ? "true" : undefined}>
              Period before
            </Link>
            <Link href={`${base}?${stateQuery(state, { cmp: "year" })}`} aria-current={r.compare === "year" ? "true" : undefined}>
              Same time last year
            </Link>
          </div>
        </div>
      )}
      {state.jobs.length > 1 && (
        <form method="get" className="field">
          <input type="hidden" name="page" value={state.page.slug} />
          {r && <input type="hidden" name="range" value={r.key} />}
          {r?.compare === "year" && r.key !== "ytd" && <input type="hidden" name="cmp" value="year" />}
          {r?.key === "custom" && (
            <>
              <input type="hidden" name="from" value={r.current.from} />
              <input type="hidden" name="to" value={r.current.to} />
            </>
          )}
          <label htmlFor="f-job">{v.Job}</label>
          <AutoSubmitSelect id="f-job" name="job" defaultValue={state.job ?? ""} className="input">
            <option value="">All {v.jobs}</option>
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
