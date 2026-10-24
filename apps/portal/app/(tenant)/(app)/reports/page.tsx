import type { Metadata } from "next";
import Link from "next/link";
import { withTenant } from "@numarket/db";
import { listReports } from "@numarket/db/repo/workspace";
import { ago, reportVisible } from "@/lib/data";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Status reports" };

export default async function Reports() {
  const ctx = await requireTenant("report.view");
  const reports = (await withTenant(ctx.tenant.id, listReports)).filter((r) => reportVisible(r.layout, ctx));
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Status reports</h1>
          <p>Your status reports, in your format. The numbers fill in from your data; your team writes the story.</p>
        </div>
        {ctx.can("report.edit") && (
          <Link href="/reports/new" className="btn btn-primary">
            New report
          </Link>
        )}
      </div>
      <ul className="list">
        {reports.map((r) => (
          <li key={r.slug}>
            <Link href={`/reports/${r.slug}`} className="item">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h3>{r.title}</h3>
                {r.layout.prepared_for && <span className="pill brand">For {r.layout.prepared_for}</span>}
              </div>
              <p className="small muted" style={{ margin: "4px 0 0" }}>
                {r.description} {r.latest_version ? `Version ${r.latest_version}, published ${ago(r.latest_at!)}.` : "Not published yet."}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
