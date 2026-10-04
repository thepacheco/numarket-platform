import type { Metadata } from "next";
import Link from "next/link";
import type { DataReportDef } from "@numarket/blocks";
import { withTenant } from "@numarket/db";
import { listDataReports } from "@numarket/db/repo/workspace";
import Icon from "@/components/Icon";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Run a report" };

export default async function RunReports() {
  const ctx = await requireTenant("dashboard.view");
  const list = (await withTenant(ctx.tenant.id, listDataReports)).filter((r) => !(ctx.scope && (r.definition as DataReportDef).wholeCompany));
  const cats = [...new Set(list.map((r) => r.category))];
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Run a report</h1>
          <p>Lists of your data you can run any time: pick the period, the job, and how to group it, then download it as a spreadsheet or PDF.</p>
        </div>
      </div>
      {cats.map((c) => (
        <section key={c} style={{ marginBottom: 22 }}>
          <h2 className="section-h">{c}</h2>
          <div className="grid-3">
            {list
              .filter((r) => r.category === c)
              .map((r) => (
                <Link key={r.slug} href={`/run/${r.slug}`} className="item">
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <h3>{r.title}</h3>
                    <Icon name="table" />
                  </div>
                  <p className="small muted" style={{ margin: "4px 0 0" }}>
                    {r.description}
                  </p>
                </Link>
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
