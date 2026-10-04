/* Server-rendered building blocks. No client JavaScript: charts are inline
   SVG and HTML, so a dashboard is readable the moment it arrives. Styling
   lives in the portal's stylesheet (classes prefixed "b-"). */

import { barData, fmt, kpiData, monthShort, tableRows, trendData, type Block, type Rows } from "../index";

export type DefinitionInfo = { name: string; means: string; sources: string; formula: string };
export type Defs = Record<string, DefinitionInfo>;

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

function Card({ block, defs, updated, children, className = "" }: { block: Block; defs: Defs; updated?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`b-card span-${block.span ?? 1} ${className}`} aria-label={block.title}>
      <h3 className="b-title">
        <DefTip def={block.definition ? defs[block.definition] : undefined} updated={updated}>
          {block.title}
        </DefTip>
      </h3>
      {children}
    </section>
  );
}

export function BlockView({ block, rows, defs, updated }: { block: Block; rows: Rows; defs: Defs; updated?: string }) {
  if (block.type === "kpi") {
    const d = kpiData(block, rows);
    return (
      <Card block={block} defs={defs} updated={updated} className="b-kpi">
        <p className="b-kpi-v tnum">{d.value === null ? "—" : fmt(d.value, block.format)}</p>
        {d.status && <span className={`pill ${d.status}`}>{d.status === "good" ? "On or under budget" : "Over budget"}</span>}
      </Card>
    );
  }
  if (block.type === "bar") {
    const data = barData(block, rows);
    const max = Math.max(1, ...data.map((x) => x.value));
    return (
      <Card block={block} defs={defs} updated={updated}>
        {data.length ? (
          <ul className="b-bars">
            {data.map((x) => (
              <li key={x.label}>
                <span className="b-bar-l">{x.label}</span>
                <span className="b-bar-t" aria-hidden="true">
                  <i style={{ width: `${(x.value / max) * 100}%` }} />
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
  if (block.type === "trend") return <Trend block={block} rows={rows} defs={defs} updated={updated} />;
  const data = tableRows(block, rows);
  return (
    <Card block={block} defs={defs} updated={updated}>
      {data.length ? (
        <div className="b-table-wrap">
          <table className="b-table">
            <thead>
              <tr>
                {block.columns.map((c) => (
                  <th key={c.field} scope="col" className={isNum(c.format) ? "num" : ""}>
                    <DefTip def={c.definition ? defs[c.definition] : undefined} updated={updated}>
                      {c.label}
                    </DefTip>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i}>
                  {block.columns.map((c) => (
                    <td key={c.field} className={isNum(c.format) ? "num tnum" : ""}>
                      {c.format === "status" ? <span className={`pill ${String(r[c.field])}`}>{fmt(r[c.field], "status")}</span> : fmt(r[c.field], c.format)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty />
      )}
    </Card>
  );
}

const isNum = (f?: string) => f === "money" || f === "num" || f === "pct" || f === "dec2" || f === "hours" || f === "over";

function Empty() {
  return <p className="b-empty">Nothing to show for this view.</p>;
}

function Trend({ block, rows, defs, updated }: { block: Extract<Block, { type: "trend" }>; rows: Rows; defs: Defs; updated?: string }) {
  const data = trendData(block, rows);
  const W = 640, H = 220, L = 52, R = 12, T = 12, B = 28;
  const vals = data.flatMap((d) => block.series.map((s) => Number(d[s.field as keyof typeof d]) || 0));
  const max = Math.max(1, ...vals) * 1.08;
  const x = (i: number) => L + (data.length <= 1 ? 0 : (i / (data.length - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const colors = ["var(--series-a)", "var(--series-b)"];
  return (
    <Card block={block} defs={defs} updated={updated}>
      {data.length ? (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="b-trend" role="img" aria-label={`${block.title}. ${block.series.map((s) => s.label).join(" and ")} by month.`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="b-grid" />
                <text x={L - 8} y={y(t) + 4} textAnchor="end" className="b-axis">
                  {fmt(t, block.format)}
                </text>
              </g>
            ))}
            {data.map((d, i) =>
              i % Math.ceil(data.length / 6) === 0 || i === data.length - 1 ? (
                <text key={d.key} x={x(i)} y={H - 8} textAnchor="middle" className="b-axis">
                  {monthShort(d.key)}
                </text>
              ) : null,
            )}
            {block.series.map((s, si) => {
              const pts = data.map((d, i) => `${x(i).toFixed(1)},${y(Number(d[s.field as keyof typeof d]) || 0).toFixed(1)}`).join(" ");
              return (
                <g key={s.field}>
                  <polyline points={pts} fill="none" stroke={colors[si % 2]} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                  {data.map((d, i) => (
                    <circle key={i} cx={x(i)} cy={y(Number(d[s.field as keyof typeof d]) || 0)} r={3} fill={colors[si % 2]}>
                      <title>{`${monthShort(d.key)} · ${s.label}: ${fmt(d[s.field as keyof typeof d], block.format)}`}</title>
                    </circle>
                  ))}
                </g>
              );
            })}
          </svg>
          <ul className="b-legend">
            {block.series.map((s, si) => (
              <li key={s.field}>
                <i style={{ background: colors[si % 2] }} />
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
