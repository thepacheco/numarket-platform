import type { SketchBlock } from "@numarket/db/repo/requests";

/* A rough sketch of a dashboard page built from numarket's standard blocks.
   Clients pick blocks when they ask for a change; this shows the idea, not
   the final page (numarket builds that). */

export const SKETCH_INFO: Record<SketchBlock, { name: string; hint: string }> = {
  kpis: { name: "Key numbers", hint: "Three or four headline figures with the change from last period" },
  line: { name: "Line over time", hint: "A trend, month by month" },
  bars: { name: "Bars by group", hint: "Compare jobs, customers, or causes" },
  table: { name: "Table", hint: "Every row, sortable" },
  matrix: { name: "Matrix you can expand", hint: "Totals that open into detail, like a P&L" },
  heatmap: { name: "Heat map", hint: "Spot the hot spots across two dimensions" },
};

function Block({ b }: { b: SketchBlock }) {
  if (b === "kpis")
    return (
      <div className="sk-kpis">
        {[0, 1, 2, 3].map((i) => (
          <span key={i}>
            <i />
            <b />
          </span>
        ))}
      </div>
    );
  if (b === "line")
    return (
      <svg className="sk-chart" viewBox="0 0 200 70" preserveAspectRatio="none" aria-hidden="true">
        <polyline points="0,55 25,48 50,50 75,38 100,40 125,28 150,30 175,18 200,22" fill="none" strokeWidth="2" />
      </svg>
    );
  if (b === "bars")
    return (
      <div className="sk-bars">
        {[60, 85, 40, 70, 55, 30].map((h, i) => (
          <i key={i} style={{ height: `${h}%` }} />
        ))}
      </div>
    );
  if (b === "heatmap")
    return (
      <div className="sk-heat">
        {Array.from({ length: 24 }, (_, i) => (
          <i key={i} style={{ opacity: 0.15 + (((i * 7) % 11) / 11) * 0.8 }} />
        ))}
      </div>
    );
  return (
    <div className={`sk-table ${b === "matrix" ? "matrix" : ""}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={b === "matrix" && (i === 1 || i === 2) ? "child" : ""}>
          <i />
          <b />
        </span>
      ))}
    </div>
  );
}

export default function SketchPreview({ blocks, title }: { blocks: SketchBlock[]; title?: string }) {
  if (!blocks.length) return null;
  return (
    <figure className="sketch" aria-label={`Sketch: ${blocks.map((b) => SKETCH_INFO[b].name).join(", ")}`}>
      <figcaption>
        <span>{title || "Your new page"}</span>
        <span className="sketch-tag">Sketch, not final</span>
      </figcaption>
      <div className="sketch-body">
        {blocks.map((b) => (
          <div key={b} className={`sk sk-w-${b}`}>
            <small>{SKETCH_INFO[b].name}</small>
            <Block b={b} />
          </div>
        ))}
      </div>
    </figure>
  );
}
