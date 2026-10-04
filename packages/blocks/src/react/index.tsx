/* Server-rendered building blocks. No client JavaScript: charts are inline
   SVG and HTML, so a dashboard is readable the moment it arrives. Styling
   lives in the portal's stylesheet (classes prefixed "b-"). */

import type { Scope } from "@numarket/db/repo/snapshots";
import {
  barData, fmt, fmtChange, isDated, kpiData, monthLabel, seriesData, stackedData, statementData, tableRows, tableTotals, visibleRows,
  type Block, type Datasets, type Format, type RangeSel, type Rows,
} from "../index";

export type DefinitionInfo = { name: string; means: string; sources: string; formula: string };
export type Defs = Record<string, DefinitionInfo>;
export type BlockContext = { datasets: Datasets; scope: Scope; eq: Record<string, string | undefined>; range: RangeSel | null; defs: Defs; updated?: string };

export function DefTip({ def, updated, children }: { def?: DefinitionInfo; updated?: string; children: React.ReactNode }) {
  if (!def) return <>{children}</>;
  return (
    <span className="def">
      <span className="def-label">{children}</span>
      <button type="button" className="def-btn" aria-label={`What "${def.name}" means`}>
        i
      </button>
      <span className="def-pop" role="tooltip">
        <b>{def.name}</b>
        <span>{def.means}</span>
        <span className="def-meta">
          <em>How it&apos;s calculated:</em> {def.formula}
        </span>
        <span className="def-meta">
          <em>Comes from:</em> {def.sources}
        </span>
        {updated && (
          <span className="def-meta">
            <em>Updated:</em> {updated}
          </span>
        )}
      </span>
    </span>
  );
}

function Card({ block, c, caption, children, className = "" }: { block: Block; c: BlockContext; caption?: string | null; children: React.ReactNode; className?: string }) {
  return (
    <section className={`b-card span-${block.span ?? 1} ${className}`} aria-label={block.title}>
      <header className="b-head">
        <h3 className="b-title">
          <DefTip def={block.definition ? c.defs[block.definition] : undefined} updated={c.updated}>
            {block.title}
          </DefTip>
        </h3>
        {caption && <span className="b-caption">{caption}</span>}
      </header>
      {children}
      {block.note && <p className="b-note">{block.note}</p>}
    </section>
  );
}

const isNum = (f?: Format) => f === "money" || f === "num" || f === "pct" || f === "dec2" || f === "hours" || f === "over";
const Empty = () => <p className="b-empty">Nothing to show for this view.</p>;
const COLORS = ["var(--series-a)", "var(--series-b)", "var(--series-c)"];

export function BlockView({ block, c }: { block: Block; c: BlockContext }) {
  const dated = isDated(c.datasets, block.dataset);
  const rows = visibleRows(c.datasets, block.dataset, c.scope, { eq: c.eq, range: dated ? c.range?.current : null });
  const priorRows = dated && c.range?.prior ? visibleRows(c.datasets, block.dataset, c.scope, { eq: c.eq, range: c.range.prior }) : null;
  const caption = c.range && !dated ? "As of today" : null;

  if (block.type === "kpi") {
    const d = kpiData(block, rows, priorRows);
    /* a percentage is meaningless against a near-zero base; show the amount instead */
    const ch = d.change !== null && Math.abs(d.change) > 2 && block.format !== "pct" && d.value !== null && d.prior !== null
      ? `${d.value >= d.prior ? "▲" : "▼"} ${fmt(Math.abs(d.value - d.prior), block.format)}`
      : fmtChange(d.change, block.format);
    return (
      <Card block={block} c={c} className="b-kpi" caption={caption}>
        <p className="b-kpi-v tnum">{d.value === null ? "—" : fmt(d.value, block.format)}</p>
        {d.status ? (
          <span className={`pill ${d.tone === "good" ? "good" : "risk"}`}>{d.status}</span>
        ) : ch ? (
          <p className={`b-delta ${d.tone ?? ""}`}>
            <b className="tnum">{ch}</b> {c.range?.compareLabel}
          </p>
        ) : (
          <p className="b-delta">{dated && c.range ? c.range.label : " "}</p>
        )}
      </Card>
    );
  }

  if (block.type === "bar") {
    const data = barData(block, rows);
    const max = Math.max(1, ...data.map((x) => Math.abs(x.value)));
    return (
      <Card block={block} c={c} caption={caption}>
        {data.length ? (
          <ul className="b-bars">
            {data.map((x) => (
              <li key={x.label}>
                <span className="b-bar-l" title={x.label}>
                  {x.label}
                </span>
                <span className="b-bar-t" aria-hidden="true">
                  <i style={{ width: `${(Math.abs(x.value) / max) * 100}%` }} />
                </span>
                <b className="tnum">{fmt(x.value, block.format)}</b>
              </li>
            ))}
          </ul>
        ) : (
          <Empty />
        )}
      </Card>
    );
  }

  if (block.type === "stacked") {
    const data = stackedData(block, rows);
    const max = Math.max(1, ...data.map((x) => x.total));
    return (
      <Card block={block} c={c} caption={caption}>
        {data.length ? (
          <>
            <ul className="b-stack">
              {data.map((x) => (
                <li key={x.label}>
                  <span className="b-bar-l" title={x.label}>
                    {x.label}
                  </span>
                  <span className="b-stack-t" style={{ width: `${(x.total / max) * 100}%` }} aria-hidden="true">
                    {x.values.map((v, i) => (v > 0 ? <i key={i} className={`age-${i}`} style={{ flexGrow: v }} title={`${block.segments[i].label}: ${fmt(v, block.format, { full: true })}`} /> : null))}
                  </span>
                  <b className="tnum">{fmt(x.total, block.format)}</b>
                </li>
              ))}
            </ul>
            <ul className="b-legend">
              {block.segments.map((s, i) => (
                <li key={s.field}>
                  <i className={`age-${i}`} />
                  {s.label}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <Empty />
        )}
      </Card>
    );
  }

  if (block.type === "trend" || block.type === "columns") {
    const data = seriesData(block, rows, dated ? c.range?.current : null);
    return (
      <Card block={block} c={c} caption={caption ?? (dated && c.range ? c.range.label : null)}>
        {data.length ? <Chart kind={block.type} title={block.title} data={data} series={block.series.map((s) => s.label)} format={block.format} /> : <Empty />}
      </Card>
    );
  }

  if (block.type === "statement") {
    const lines = statementData(block, rows, priorRows);
    const hasPrior = !!priorRows;
    return (
      <Card block={block} c={c} caption={c.range ? c.range.label : null}>
        <div className="b-table-wrap">
          <table className="b-table b-statement">
            <thead>
              <tr>
                <th scope="col">Account</th>
                <th scope="col" className="num">
                  {c.range ? "This period" : "Amount"}
                </th>
                {hasPrior && (
                  <>
                    <th scope="col" className="num">
                      Prior period
                    </th>
                    <th scope="col" className="num">
                      Change
                    </th>
                  </>
                )}
                <th scope="col" className="num">
                  % of revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) =>
                l.kind === "group" ? (
                  <tr key={i} className="st-group">
                    <td colSpan={hasPrior ? 5 : 3}>{l.label}</td>
                  </tr>
                ) : (
                  <tr key={i} className={`st-${l.kind}`}>
                    <td>{l.label}</td>
                    <td className="num tnum">{fmt(l.current, "money", { full: true })}</td>
                    {hasPrior && (
                      <>
                        <td className="num tnum muted">{fmt(l.prior, "money", { full: true })}</td>
                        <td className="num tnum">{l.prior ? fmtChange((l.current - l.prior) / Math.abs(l.prior), "money") : "—"}</td>
                      </>
                    )}
                    <td className="num tnum muted">{l.share === null ? "—" : fmt(l.share, "pct")}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  const data = tableRows(block, rows);
  const totals = tableTotals(block, data);
  return (
    <Card block={block} c={c} caption={caption ?? (dated && c.range ? c.range.label : null)}>
      {data.length ? (
        <div className="b-table-wrap">
          <table className="b-table">
            <thead>
              <tr>
                {block.columns.map((col) => (
                  <th key={col.field} scope="col" className={isNum(col.format) ? "num" : ""}>
                    <DefTip def={col.definition ? c.defs[col.definition] : undefined} updated={c.updated}>
                      {col.label}
                    </DefTip>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i}>
                  {block.columns.map((col) => (
                    <td key={col.field} className={isNum(col.format) ? "num tnum" : ""}>
                      {col.format === "status" ? <span className={`pill ${String(r[col.field])}`}>{fmt(r[col.field], "status")}</span> : fmt(r[col.field], col.format)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {totals && (
              <tfoot>
                <tr>
                  {block.columns.map((col, i) => (
                    <td key={col.field} className={isNum(col.format) ? "num tnum" : ""}>
                      {i === 0 ? "Total" : col.field in totals ? fmt(totals[col.field], col.format) : ""}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : (
        <Empty />
      )}
    </Card>
  );
}

/* Line or grouped-column chart over months (or any category). */
export function Chart({ kind, title, data, series, format }: { kind: "trend" | "columns"; title: string; data: { key: string; values: number[] }[]; series: string[]; format: Format }) {
  const W = 680, H = 230, L = 56, R = 12, T = 12, B = 28;
  const vals = data.flatMap((d) => d.values);
  const max = Math.max(1, ...vals) * 1.08;
  const min = Math.min(0, ...vals) * 1.08;
  const span = max - min || 1;
  const n = data.length;
  const iw = W - L - R;
  const step = iw / Math.max(1, n);
  const x = (i: number) => (kind === "columns" ? L + step * i + step / 2 : L + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw));
  const y = (v: number) => T + (1 - (v - min) / span) * (H - T - B);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + t * span);
  const labelEvery = Math.ceil(n / 8);
  const isMonth = /^\d{4}-\d{2}$/.test(data[0]?.key ?? "");
  const xl = (k: string) => (isMonth ? monthLabel(k, { short: true }) : k);
  const bw = Math.min(26, (step * 0.72) / series.length);
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="b-trend" role="img" aria-label={`${title}. ${series.join(" and ")}.`}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className={Math.abs(t) < span * 1e-6 ? "b-zero" : "b-grid"} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" className="b-axis">
              {fmt(t, format)}
            </text>
          </g>
        ))}
        {data.map((d, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={d.key} x={x(i)} y={H - 8} textAnchor="middle" className="b-axis">
              {xl(d.key)}
            </text>
          ) : null,
        )}
        {kind === "columns"
          ? data.map((d, i) =>
              d.values.map((v, si) => {
                const x0 = x(i) - (bw * series.length) / 2 + si * bw;
                const y0 = y(Math.max(0, v)), y1 = y(Math.min(0, v));
                return (
                  <rect key={`${i}-${si}`} x={x0 + 1} y={y0} width={bw - 2} height={Math.max(1, y1 - y0)} rx={2} fill={COLORS[si % 3]}>
                    <title>{`${xl(d.key)} · ${series[si]}: ${fmt(v, format)}`}</title>
                  </rect>
                );
              }),
            )
          : series.map((s, si) => (
              <g key={s}>
                {si === 0 && <polygon points={`${x(0)},${y(Math.max(0, min))} ${data.map((d, i) => `${x(i).toFixed(1)},${y(d.values[si]).toFixed(1)}`).join(" ")} ${x(n - 1)},${y(Math.max(0, min))}`} fill={COLORS[0]} opacity={0.08} />}
                <polyline points={data.map((d, i) => `${x(i).toFixed(1)},${y(d.values[si]).toFixed(1)}`).join(" ")} fill="none" stroke={COLORS[si % 3]} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
                {data.map((d, i) => (
                  <circle key={i} cx={x(i)} cy={y(d.values[si])} r={n > 18 ? 2 : 3} fill={COLORS[si % 3]}>
                    <title>{`${xl(d.key)} · ${s}: ${fmt(d.values[si], format)}`}</title>
                  </circle>
                ))}
              </g>
            ))}
      </svg>
      <ul className="b-legend">
        {series.map((s, si) => (
          <li key={s}>
            <i style={{ background: COLORS[si % 3] }} />
            {s}
          </li>
        ))}
      </ul>
    </>
  );
}

export type { Rows };
