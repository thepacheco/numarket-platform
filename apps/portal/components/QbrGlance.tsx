import { fmt, fmtChange } from "@numarket/blocks";
import type { GlanceRow } from "@/lib/qbr";

/* This quarter against the comparison, one line per headline number. Color
   only where something moved: green when it got better, red when worse. */
export default function QbrGlance({ rows, current, prior }: { rows: GlanceRow[]; current: string; prior: string }) {
  return (
    <table className="qbr-glance">
      <thead>
        <tr>
          <th scope="col">Measure</th>
          <th scope="col" className="num">
            {current}
          </th>
          <th scope="col" className="num">
            {prior}
          </th>
          <th scope="col" className="num">
            Change
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.title}>
            <th scope="row">{r.title}</th>
            <td className="num tnum">{r.value === null ? "—" : fmt(r.value, r.format)}</td>
            <td className="num tnum muted">{r.prior === null ? "—" : fmt(r.prior, r.format)}</td>
            <td className={`num tnum ${r.tone ?? ""}`}>{r.change === null ? "—" : fmtChange(r.change, r.format)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
