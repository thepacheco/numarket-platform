import { Document, Font, Page, StyleSheet, Svg, Line, Polyline, Rect, Text, View, renderToBuffer, G } from "@react-pdf/renderer";

/* keep names whole: no hyphenation */
Font.registerHyphenationCallback((word) => [word]);
import {
  barData, isDated, kpiData, monthLabel, resolveRange, seriesData, stackedData, statementData, tableRows, tableTotals, visibleRows,
  type Block, type Datasets, type Filters, type KpiBlock, type RangeSel,
} from "@numarket/blocks";
import type { Scope } from "@numarket/db/repo/snapshots";
import { fmt, fmtChange, pdfText } from "./text";
import type { ReportLayout } from "@numarket/db/repo/workspace";

/* A status report as a real, designed PDF (not a printed web page): branded
   cover band, summary, key numbers, project table, charts, and commentary,
   with a page footer. Built from the same published snapshot as the screen. */

export type ReportPdfInput = {
  title: string;
  layout: ReportLayout;
  commentary: Record<string, string>;
  datasets: Datasets;
  scope: Scope;
  asOfMonth: string;
  periodLabel: string;
  versionLine: string;
  brand: { name: string; logo: string; primary: string; footer: string | null };
};

const INK = "#0B1F2E";
const MUTED = "#5C6F81";
const LINE = "#E3E9EF";
const SOFT = "#F3F6F9";
const SERIES = ["#2A7BB0", "#E07A5F", "#6C5DD3"];
const AGE = ["#2E9E6B", "#38A3A5", "#D9A21B", "#E07A5F", "#B4381F"];
const STATUS: Record<string, { fg: string; bg: string }> = {
  good: { fg: "#17734B", bg: "#E5F6ED" },
  watch: { fg: "#8A5700", bg: "#FFF3D6" },
  risk: { fg: "#B4381F", bg: "#FDEAE4" },
};

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 54, paddingHorizontal: 40, fontFamily: "Helvetica", fontSize: 9.5, color: INK },
  band: { marginHorizontal: -40, marginTop: -36, paddingHorizontal: 40, paddingTop: 30, paddingBottom: 22, marginBottom: 20, flexDirection: "row", alignItems: "center" },
  logo: { width: 38, height: 38, borderRadius: 7, borderWidth: 1, borderColor: "#FFFFFF88", alignItems: "center", justifyContent: "center", marginRight: 14 },
  logoText: { color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 13 },
  bandTitle: { color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 18 },
  bandSub: { color: "#FFFFFFDD", fontSize: 10, marginTop: 3 },
  bandRight: { marginLeft: "auto", alignItems: "flex-end" },
  bandMeta: { color: "#FFFFFFCC", fontSize: 8.5, marginTop: 2 },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 8.5, letterSpacing: 0.8, color: MUTED, textTransform: "uppercase", marginBottom: 6 },
  section: { marginBottom: 16 },
  para: { fontSize: 10.5, lineHeight: 1.5 },
  kpis: { flexDirection: "row", marginBottom: 16 },
  kpi: { flex: 1, borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 10, marginRight: 8 },
  kpiLabel: { fontSize: 8, color: MUTED, marginBottom: 4 },
  kpiValue: { fontFamily: "Helvetica-Bold", fontSize: 16 },
  kpiNote: { fontSize: 7.5, marginTop: 4 },
  blockTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 6 },
  caption: { fontSize: 7.5, color: MUTED, marginLeft: 6, fontFamily: "Helvetica" },
  th: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: MUTED, textTransform: "uppercase", paddingVertical: 5, paddingHorizontal: 5 },
  td: { fontSize: 8.5, paddingVertical: 5, paddingHorizontal: 5 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE },
  footer: { position: "absolute", left: 40, right: 40, bottom: 22, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: MUTED, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 6 },
});

const isNum = (f?: string) => f === "money" || f === "num" || f === "pct" || f === "dec2" || f === "hours" || f === "over";

type Ctx = { datasets: Datasets; scope: Scope; eq: Filters["eq"]; range: RangeSel };
const rowsFor = (b: Block, c: Ctx, prior = false) => {
  const dated = isDated(c.datasets, b.dataset);
  if (prior && !(dated && c.range.prior)) return null;
  return visibleRows(c.datasets, b.dataset, c.scope, { eq: c.eq, range: dated ? (prior ? c.range.prior : c.range.current) : null });
};

function Kpis({ blocks, c }: { blocks: KpiBlock[]; c: Ctx }) {
  return (
    <View style={s.kpis} wrap={false}>
      {blocks.map((b, i) => {
        const d = kpiData(b, rowsFor(b, c)!, rowsFor(b, c, true));
        const tone = d.tone === "good" ? STATUS.good.fg : d.tone === "bad" ? STATUS.risk.fg : MUTED;
        return (
          <View key={i} style={[s.kpi, i === blocks.length - 1 ? { marginRight: 0 } : {}]}>
            <Text style={s.kpiLabel}>{b.title}</Text>
            <Text style={s.kpiValue}>{d.value === null ? "—" : fmt(d.value, b.format)}</Text>
            {d.status ? (
              <Text style={[s.kpiNote, { color: tone }]}>{d.status}</Text>
            ) : d.change !== null && Math.abs(d.change) <= 2 ? (
              <Text style={[s.kpiNote, { color: tone }]}>{`${fmtChange(d.change, b.format)} ${c.range.compareLabel ?? ""}`}</Text>
            ) : (
              <Text style={[s.kpiNote, { color: MUTED }]}>{isDated(c.datasets, b.dataset) ? c.range.label : "To date"}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function Table({ b, c }: { b: Extract<Block, { type: "table" }>; c: Ctx }) {
  const rows = tableRows(b, rowsFor(b, c)!);
  const totals = tableTotals(b, rows);
  const widths = b.columns.map((col, i) => (i === 0 ? 2.1 : col.field === "customer" ? 2.6 : 1));
  const cell = (i: number) => ({ flex: widths[i] });
  return (
    <View style={s.section}>
      <Text style={s.blockTitle}>{b.title}</Text>
      <View style={[s.row, { backgroundColor: SOFT, borderTopWidth: 1, borderTopColor: LINE }]} fixed={false}>
        {b.columns.map((col, i) => (
          <Text key={col.field} style={[s.th, cell(i), isNum(col.format) ? { textAlign: "right" } : {}]}>
            {col.label}
          </Text>
        ))}
      </View>
      {rows.map((r, ri) => (
        <View key={ri} style={s.row} wrap={false}>
          {b.columns.map((col, i) =>
            col.format === "status" ? (
              <View key={col.field} style={[cell(i), { paddingVertical: 3, paddingHorizontal: 5 }]}>
                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: STATUS[String(r[col.field])]?.fg ?? MUTED, backgroundColor: STATUS[String(r[col.field])]?.bg, paddingVertical: 2, paddingHorizontal: 5, borderRadius: 8, alignSelf: "flex-start" }}>
                  {fmt(r[col.field], "status")}
                </Text>
              </View>
            ) : (
              <Text key={col.field} style={[s.td, cell(i), isNum(col.format) ? { textAlign: "right" } : {}]}>
                {fmt(r[col.field], col.format)}
              </Text>
            ),
          )}
        </View>
      ))}
      {totals && (
        <View style={[s.row, { borderBottomWidth: 0, borderTopWidth: 1.5, borderTopColor: INK }]}>
          {b.columns.map((col, i) => (
            <Text key={col.field} style={[s.td, cell(i), { fontFamily: "Helvetica-Bold" }, isNum(col.format) ? { textAlign: "right" } : {}]}>
              {i === 0 ? "Total" : col.field in totals ? fmt(totals[col.field], col.format) : ""}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function Chart({ b, c }: { b: Extract<Block, { type: "trend" | "columns" }>; c: Ctx }) {
  const dated = isDated(c.datasets, b.dataset);
  const data = seriesData(b, rowsFor(b, c)!, dated ? c.range.current : null);
  const W = 532, H = 150, L = 46, R = 6, T = 8, B = 18;
  const vals = data.flatMap((d) => d.values);
  const max = Math.max(1, ...vals) * 1.08;
  const min = Math.min(0, ...vals) * 1.08;
  const span = max - min || 1;
  const n = data.length;
  const iw = W - L - R;
  const step = iw / Math.max(1, n);
  const x = (i: number) => (b.type === "columns" ? L + step * i + step / 2 : L + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw));
  const y = (v: number) => T + (1 - (v - min) / span) * (H - T - B);
  const ticks = [0, 0.5, 1].map((t) => min + t * span);
  const every = Math.ceil(n / 6);
  const bw = Math.min(14, (step * 0.7) / b.series.length);
  return (
    <View style={s.section} wrap={false}>
      <Text style={s.blockTitle}>
        {b.title}
        {dated ? <Text style={s.caption}>  {c.range.label}</Text> : null}
      </Text>
      <Svg width={W} height={H}>
        {ticks.map((t, i) => (
          <G key={i}>
            <Line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={LINE} strokeWidth={0.8} />
            <Text x={L - 4} y={y(t) + 3} style={{ fontSize: 6.5 }} fill={MUTED} textAnchor="end">
              {fmt(t, b.format)}
            </Text>
          </G>
        ))}
        {data.map((d, i) =>
          i % every === 0 || i === n - 1 ? (
            <Text key={d.key} x={x(i)} y={H - 4} style={{ fontSize: 6.5 }} fill={MUTED} textAnchor="middle">
              {/^\d{4}-\d{2}$/.test(d.key) ? monthLabel(d.key, { short: true }) : d.key}
            </Text>
          ) : null,
        )}
        {b.type === "columns"
          ? data.flatMap((d, i) => d.values.map((v, si) => <Rect key={`${i}-${si}`} x={x(i) - (bw * b.series.length) / 2 + si * bw + 0.5} y={y(Math.max(0, v))} width={bw - 1} height={Math.max(0.5, y(Math.min(0, v)) - y(Math.max(0, v)))} fill={SERIES[si % 3]} />))
          : b.series.map((ser, si) => <Polyline key={ser.label} points={data.map((d, i) => `${x(i).toFixed(1)},${y(d.values[si]).toFixed(1)}`).join(" ")} stroke={SERIES[si % 3]} strokeWidth={1.6} fill="none" />)}
      </Svg>
      <View style={{ flexDirection: "row", marginTop: 4 }}>
        {b.series.map((ser, si) => (
          <View key={ser.label} style={{ flexDirection: "row", alignItems: "center", marginRight: 12 }}>
            <View style={{ width: 7, height: 7, backgroundColor: SERIES[si % 3], marginRight: 4, borderRadius: 1 }} />
            <Text style={{ fontSize: 7.5, color: MUTED }}>{ser.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Bars({ b, c }: { b: Extract<Block, { type: "bar" }>; c: Ctx }) {
  const dated = isDated(c.datasets, b.dataset);
  const data = barData(b, rowsFor(b, c)!);
  const max = Math.max(1, ...data.map((d) => Math.abs(d.value)));
  return (
    <View style={s.section} wrap={false}>
      <Text style={s.blockTitle}>
        {b.title}
        {dated ? <Text style={s.caption}>  {c.range.label}</Text> : null}
      </Text>
      {data.map((d) => (
        <View key={d.label} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
          <Text style={{ width: 150, fontSize: 8.5 }}>{d.label}</Text>
          <View style={{ flex: 1, height: 7, backgroundColor: SOFT, borderRadius: 2 }}>
            <View style={{ width: `${(Math.abs(d.value) / max) * 100}%`, height: 7, backgroundColor: "#38A3A5", borderRadius: 2 }} />
          </View>
          <Text style={{ width: 70, textAlign: "right", fontSize: 8.5, fontFamily: "Helvetica-Bold" }}>{fmt(d.value, b.format)}</Text>
        </View>
      ))}
    </View>
  );
}

function Stacked({ b, c }: { b: Extract<Block, { type: "stacked" }>; c: Ctx }) {
  const data = stackedData(b, rowsFor(b, c)!);
  const max = Math.max(1, ...data.map((d) => d.total));
  return (
    <View style={s.section} wrap={false}>
      <Text style={s.blockTitle}>{b.title}</Text>
      {data.map((d) => (
        <View key={d.label} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
          <Text style={{ width: 150, fontSize: 8.5 }}>{d.label}</Text>
          <View style={{ flex: 1 }}>
            <View style={{ width: `${(d.total / max) * 100}%`, height: 8, flexDirection: "row" }}>
              {d.values.map((v, i) => (v > 0 ? <View key={i} style={{ flexGrow: v, backgroundColor: AGE[i] }} /> : null))}
            </View>
          </View>
          <Text style={{ width: 70, textAlign: "right", fontSize: 8.5, fontFamily: "Helvetica-Bold" }}>{fmt(d.total, b.format)}</Text>
        </View>
      ))}
    </View>
  );
}

function Statement({ b, c }: { b: Extract<Block, { type: "statement" }>; c: Ctx }) {
  const lines = statementData(b, rowsFor(b, c)!, rowsFor(b, c, true));
  const hasPrior = !!c.range.prior;
  const col = (w: number, right = true) => ({ width: w, textAlign: right ? ("right" as const) : ("left" as const) });
  return (
    <View style={s.section}>
      <Text style={s.blockTitle}>
        {b.title}
        <Text style={s.caption}>  {c.range.label}</Text>
      </Text>
      <View style={[s.row, { backgroundColor: SOFT, borderTopWidth: 1, borderTopColor: LINE }]}>
        <Text style={[s.th, { flex: 1 }]}>Account</Text>
        <Text style={[s.th, col(90)]}>This period</Text>
        {hasPrior && <Text style={[s.th, col(90)]}>Prior period</Text>}
        <Text style={[s.th, col(70)]}>% of revenue</Text>
      </View>
      {lines.map((l, i) =>
        l.kind === "group" ? (
          <Text key={i} style={{ fontFamily: "Helvetica-Bold", fontSize: 7.5, color: MUTED, textTransform: "uppercase", paddingTop: 8, paddingBottom: 3, paddingHorizontal: 5 }}>
            {l.label}
          </Text>
        ) : (
          <View key={i} style={[s.row, l.kind === "total" ? { backgroundColor: "#EEF4F8" } : {}]} wrap={false}>
            <Text style={[s.td, { flex: 1, paddingLeft: l.kind === "line" ? 14 : 5, fontFamily: l.kind === "line" ? "Helvetica" : "Helvetica-Bold" }]}>{l.label}</Text>
            <Text style={[s.td, col(90), l.kind === "line" ? {} : { fontFamily: "Helvetica-Bold" }]}>{fmt(l.current, "money", { full: true })}</Text>
            {hasPrior && <Text style={[s.td, col(90), { color: MUTED }]}>{fmt(l.prior, "money", { full: true })}</Text>}
            <Text style={[s.td, col(70), { color: MUTED }]}>{l.share === null ? "—" : fmt(l.share, "pct")}</Text>
          </View>
        ),
      )}
    </View>
  );
}

function ReportPdf(p: ReportPdfInput) {
  const c: Ctx = { datasets: p.datasets, scope: p.scope, eq: { job: p.layout.job ?? undefined }, range: resolveRange(p.asOfMonth, p.layout.range ?? "12m") };
  return (
    <Document title={`${p.title} · ${p.periodLabel}`} author={p.brand.name} creator="numarket Portal">
      <Page size="LETTER" style={s.page}>
        <View style={[s.band, { backgroundColor: p.brand.primary }]}>
          <View style={s.logo}>
            <Text style={s.logoText}>{p.brand.logo}</Text>
          </View>
          <View>
            <Text style={s.bandTitle}>{p.layout.prepared_for ? `Prepared for ${p.layout.prepared_for}` : p.brand.name}</Text>
            <Text style={s.bandSub}>
              {p.title} · {p.periodLabel}
            </Text>
          </View>
          <View style={s.bandRight}>
            {p.layout.prepared_for && <Text style={[s.bandMeta, { color: "#FFFFFF", fontFamily: "Helvetica-Bold" }]}>{p.brand.name}</Text>}
            <Text style={s.bandMeta}>{p.versionLine}</Text>
          </View>
        </View>

        {p.layout.sections.map((sec, i) => {
          if (sec.type === "commentary")
            return (
              <View key={i} style={s.section} wrap={false}>
                <Text style={[s.h2, { borderLeftWidth: 2, borderLeftColor: p.brand.primary, paddingLeft: 6 }]}>{sec.title}</Text>
                <Text style={s.para}>{pdfText(p.commentary[sec.key]?.trim() || "Not written yet.")}</Text>
              </View>
            );
          if (sec.type === "pagebreak") return <View key={i} break />;
          if (sec.type === "kpis") return <Kpis key={i} blocks={sec.blocks as KpiBlock[]} c={c} />;
          const b = sec.block as Block;
          if (b.type === "table") return <Table key={i} b={b} c={c} />;
          if (b.type === "trend" || b.type === "columns") return <Chart key={i} b={b} c={c} />;
          if (b.type === "bar") return <Bars key={i} b={b} c={c} />;
          if (b.type === "stacked") return <Stacked key={i} b={b} c={c} />;
          if (b.type === "statement") return <Statement key={i} b={b} c={c} />;
          return null;
        })}

        <View style={s.footer} fixed>
          <Text>{p.layout.prepared_for ? `Prepared by ${p.brand.name} for ${p.layout.prepared_for} · Confidential` : (p.brand.footer ?? `${p.brand.name} · Confidential`)}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export function renderReportPdf(input: ReportPdfInput) {
  return renderToBuffer(<ReportPdf {...input} />);
}
