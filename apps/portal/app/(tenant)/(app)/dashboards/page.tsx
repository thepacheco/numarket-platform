import type { Metadata } from "next";
import Link from "next/link";
import type { DashboardLayout } from "@numarket/blocks";
import { withTenant } from "@numarket/db";
import { listDashboards } from "@numarket/db/repo/workspace";
import Icon from "@/components/Icon";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Dashboards" };

export default async function Dashboards() {
  const ctx = await requireTenant("dashboard.view");
  const list = (await withTenant(ctx.tenant.id, listDashboards)).filter((d) => !(ctx.scope && (d.layout as DashboardLayout).wholeCompany));
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Dashboards</h1>
          <p>Built for your business and kept current by every scheduled update. Point at any number to see what it means.</p>
        </div>
      </div>
      <div className="grid-2">
        {list.map((d) => {
          const l = d.layout as DashboardLayout;
          return (
            <Link key={d.slug} href={`/dashboards/${d.slug}`} className="item">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h3>{d.title}</h3>
                <Icon name="chart" />
              </div>
              <p className="small muted" style={{ margin: "4px 0 10px" }}>
                {d.description}
              </p>
              <div className="row" style={{ gap: 6 }}>
                {l.pages.map((p) => (
                  <span key={p.slug} className="pill">
                    {p.title}
                  </span>
                ))}
              </div>
              {l.source && <p className="dash-source" style={{ margin: "10px 0 0" }}>From {l.source}</p>}
            </Link>
          );
        })}
      </div>
    </>
  );
}
