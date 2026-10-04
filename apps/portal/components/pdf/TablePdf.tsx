import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Column, Row } from "@numarket/blocks";
import { fmt } from "./text";

/* A data report as a PDF: header, the filters it was run with, and the full
   table with totals. Landscape when there are many columns. */
Font.registerHyphenationCallback((word) => [word]);

const s = StyleSheet.create({
  page: { padding: 36, paddingBottom: 50, fontFamily: "Helvetica", fontSize: 8.5, color: "#0B1F2E" },
  head: { borderBottomWidth: 2, paddingBottom: 10, marginBottom: 12 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 16 },
  sub: { fontSize: 9, color: "#5C6F81", marginTop: 3 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E3E9EF" },
  th: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: "#5C6F81", textTransform: "uppercase", padding: 4 },
  td: { padding: 4 },
  foot: { position: "absolute", left: 36, right: 36, bottom: 20, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#5C6F81" },
});
const num = (f?: string) => f === "money" || f === "num" || f === "pct" || f === "hours" || f === "dec2";

export function renderTablePdf(p: { title: string; filters: string; company: string; primary: string; columns: Column[]; rows: Row[]; totals: Row | null; generated: string }) {
  const wide = p.columns.length > 6;
  const flex = (c: Column, i: number) => (i === 0 ? 1.6 : num(c.format) ? 1 : 1.3);
  return renderToBuffer(
    <Document title={p.title} author={p.company} creator="numarket Portal">
      <Page size="LETTER" orientation={wide ? "landscape" : "portrait"} style={s.page}>
        <View style={[s.head, { borderBottomColor: p.primary }]}>
          <Text style={s.title}>{p.title}</Text>
          <Text style={s.sub}>
            {p.company} · {p.filters}
          </Text>
        </View>
        <View style={[s.row, { backgroundColor: "#F3F6F9" }]} fixed>
          {p.columns.map((c, i) => (
            <Text key={c.field} style={[s.th, { flex: flex(c, i) }, num(c.format) ? { textAlign: "right" } : {}]}>
              {c.label}
            </Text>
          ))}
        </View>
        {p.rows.map((r, ri) => (
          <View key={ri} style={s.row} wrap={false}>
            {p.columns.map((c, i) => (
              <Text key={c.field} style={[s.td, { flex: flex(c, i) }, num(c.format) ? { textAlign: "right" } : {}]}>
                {fmt(r[c.field], c.format, { full: c.format === "money" })}
              </Text>
            ))}
          </View>
        ))}
        {p.totals && (
          <View style={[s.row, { borderTopWidth: 1.5, borderTopColor: "#0B1F2E", borderBottomWidth: 0 }]}>
            {p.columns.map((c, i) => (
              <Text key={c.field} style={[s.td, { flex: flex(c, i), fontFamily: "Helvetica-Bold" }, num(c.format) ? { textAlign: "right" } : {}]}>
                {i === 0 ? "Total" : c.field in p.totals! ? fmt(p.totals![c.field], c.format, { full: c.format === "money" }) : ""}
              </Text>
            ))}
          </View>
        )}
        <View style={s.foot} fixed>
          <Text>
            {p.company} · Confidential · Generated {p.generated}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>,
  );
}
