import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fmt, type Format } from "@numarket/blocks";
import { scopeRows } from "@numarket/db/repo/snapshots";
import { withTenant } from "@numarket/db";
import { listCatalog } from "@numarket/db/repo/workspace";
import Icon from "@/components/Icon";
import { workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Data table" };

const MONEY = /amount|actual|earned|budget|over|balance|total|current|d1_30|d31_60|d61_90|d90p|due_7d|labor_cost|change_orders/;
function typeOf(field: string, v: unknown): { label: string; f: Format } {
  if (field === "month") return { label: "Month", f: "month" };
  if (field === "date" || field === "opened") return { label: "Date", f: "date" };
  if (typeof v === "number") {
    if (MONEY.test(field)) return { label: "Money", f: "money" };
    if (field === "pct_complete") return { label: "Percent", f: "pct" };
    if (field === "cpi") return { label: "Ratio", f: "dec2" };
    return { label: "Number", f: "num" };
  }
  return { label: "Text", f: "text" };
}

export default async function DataTable({ params }: { params: Promise<{ dataset: string }> }) {
  const ctx = await requireTenant("sources.view");
  const { dataset } = await params;
  const ws = await workspace(ctx);
  const t = (await withTenant(ctx.tenant.id, listCatalog)).find((x) => x.dataset === dataset);
  if (!t) notFound();
  const rows = scopeRows(ws.snapshot?.datasets[dataset], ctx.scope);
  if (ctx.scope && !rows.length) notFound();
  const fields = Object.keys(rows[0] ?? {});
  const types = Object.fromEntries(fields.map((f) => [f, typeOf(f, rows[0]?.[f])]));
  const canDownload = ctx.can("dashboard.export") && ctx.policy.exportRoles.includes(ctx.role);
  return (
    <>
      <div className="dash-head">
        <div className="page-head" style={{ marginBottom: 0 }}>
          <div>
            <p className="eyebrow">
              <Link href="/data">Data tables</Link>
            </p>
            <h1>{t.title}</h1>
            <p>
              <code>{t.name}</code> · {t.description} {t.grain}.
            </p>
          </div>
        </div>
        {canDownload && (
          <a className="btn btn-secondary btn-sm" href={`/data/${dataset}/download`}>
            <Icon name="download" /> Download all {rows.length.toLocaleString("en-US")} rows (CSV)
          </a>
        )}
      </div>
      <div className="grid-2" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)", alignItems: "start", marginTop: 16 }}>
        <section className="card">
          <h2>Columns</h2>
          <dl className="kv small">
            {fields.map((f) => (
              <div key={f} style={{ display: "contents" }}>
                <dt>
                  <code>{f.toUpperCase()}</code>
                </dt>
                <dd>{types[f].label}</dd>
              </div>
            ))}
          </dl>
          <p className="small muted" style={{ margin: "12px 0 0" }}>
            Comes from {t.sources}. What each number means is on the <Link href="/definitions">Definitions</Link> page.
          </p>
        </section>
        <section className="card">
          <h2>Preview · first {Math.min(50, rows.length)} rows</h2>
          <div className="b-table-wrap" style={{ maxHeight: 520, overflow: "auto" }}>
            <table className="b-table">
              <thead>
                <tr>
                  {fields.map((f) => (
                    <th key={f} scope="col" className={types[f].f === "text" || types[f].f === "month" || types[f].f === "date" ? "" : "num"}>
                      {f.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i}>
                    {fields.map((f) => (
                      <td key={f} className={types[f].f === "text" || types[f].f === "month" || types[f].f === "date" ? "" : "num tnum"}>
                        {fmt(r[f], types[f].f, { full: true })}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
