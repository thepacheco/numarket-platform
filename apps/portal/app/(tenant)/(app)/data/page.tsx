import type { Metadata } from "next";
import Link from "next/link";
import { scopeRows } from "@numarket/db/repo/snapshots";
import { withTenant } from "@numarket/db";
import { listCatalog } from "@numarket/db/repo/workspace";
import Icon from "@/components/Icon";
import { fmtDateTime, workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Data tables" };

/* Foundation's output, made visible: the clean tables in the client's private
   database. Everything numarket builds reads from these. */
export default async function DataTables() {
  const ctx = await requireTenant("sources.view");
  const ws = await workspace(ctx);
  const tables = await withTenant(ctx.tenant.id, listCatalog);
  const ds = ws.snapshot?.datasets ?? {};
  const visible = tables.filter((t) => !ctx.scope || scopeRows(ds[t.dataset], ctx.scope).length > 0);
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Foundation</p>
          <h1>Data tables</h1>
          <p>Your cleaned, matched data lives in your own private database, a dedicated Snowflake account that holds only your company&apos;s data. These are its tables. Every dashboard, report, and answer reads from them.</p>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 18 }}>
        <div className="card">
          <h3>
            <Icon name="database" /> Your private database
          </h3>
          <p className="small muted" style={{ margin: 0 }}>
            One account, yours alone, encrypted. {visible.length} tables, updated {ws.snapshot ? fmtDateTime(ws.snapshot.published_at, ctx.tenant.timezone) : "—"}.
          </p>
        </div>
        <div className="card">
          <h3>
            <Icon name="table" /> Use it in your own tools
          </h3>
          <p className="small muted" style={{ margin: 0 }}>
            Connect Excel, Power BI, or Tableau to these tables with a read-only login your analyst sets up. <Link href="/data/connect">How it works</Link>
          </p>
        </div>
        <div className="card">
          <h3>
            <Icon name="download" /> Take it with you
          </h3>
          <p className="small muted" style={{ margin: 0 }}>
            Download any table here. If you ever leave, you get every table in open files, plus the structure and cleaning rules, within 30 days.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th scope="col">Table</th>
                <th scope="col">What&apos;s in it</th>
                <th scope="col">Comes from</th>
                <th scope="col" className="num">
                  Rows
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.dataset}>
                  <td>
                    <Link href={`/data/${t.dataset}`}>
                      <b>{t.title}</b>
                    </Link>
                    <div className="small muted">
                      <code>{t.name}</code>
                    </div>
                  </td>
                  <td className="small">
                    {t.description}
                    <div className="muted">{t.grain}</div>
                  </td>
                  <td className="small muted">{t.sources}</td>
                  <td className="num tnum">{scopeRows(ds[t.dataset], ctx.scope).length.toLocaleString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
