import type { Metadata } from "next";
import Link from "next/link";
import { withTenant } from "@numarket/db";
import { listDashboards } from "@numarket/db/repo/workspace";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Dashboards" };

export default async function Dashboards() {
  const ctx = await requireTenant("dashboard.view");
  const list = await withTenant(ctx.tenant.id, listDashboards);
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Dashboards</h1>
          <p>They update on their own from your published data. Point at any number to see what it means.</p>
        </div>
      </div>
      <ul className="list">
        {list.map((d) => (
          <li key={d.slug}>
            <Link href={`/dashboards/${d.slug}`} className="item">
              <h3>{d.title}</h3>
              <p className="muted small" style={{ margin: "4px 0 0" }}>
                {d.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
