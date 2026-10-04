import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { DashboardLayout } from "@numarket/blocks";
import { withTenant } from "@numarket/db";
import { getDashboard } from "@numarket/db/repo/workspace";
import { asOfMonth, dashState, DashboardView, stateQuery, type Params } from "@/components/Dashboard";
import Icon from "@/components/Icon";
import { fmtDateTime, workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Params> }) {
  const ctx = await requireTenant("dashboard.view");
  const { slug } = await params;
  const dash = await withTenant(ctx.tenant.id, (db) => getDashboard(db, slug));
  if (!dash) notFound();
  const layout = dash.layout as DashboardLayout;
  if (ctx.scope && layout.wholeCompany) notFound();
  const ws = await workspace(ctx);
  const datasets = ws.snapshot?.datasets ?? {};
  const state = dashState(layout, datasets, ctx, await searchParams, asOfMonth(ws.snapshot?.published_at, ctx.tenant.timezone));
  const updated = ws.snapshot ? fmtDateTime(ws.snapshot.published_at, ctx.tenant.timezone) : "";
  const canExport = ctx.can("dashboard.export") && ctx.policy.exportRoles.includes(ctx.role);
  const hasTables = state.page.rows.flat().some((b) => b.type === "table" || b.type === "statement");
  return (
    <>
      <div className="dash-head">
        <div className="page-head" style={{ marginBottom: 0 }}>
          <div>
            <p className="eyebrow">
              <Link href="/dashboards">Dashboards</Link>
            </p>
            <h1>{dash.title}</h1>
            <p>
              {dash.description}
              {layout.source ? <span className="dash-source"> · From {layout.source}</span> : null}
            </p>
          </div>
        </div>
        {canExport && hasTables && (
          <a className="btn btn-secondary btn-sm" href={`/dashboards/${slug}/export?${stateQuery(state)}`}>
            <Icon name="download" /> Export this page (CSV)
          </a>
        )}
      </div>
      {ws.snapshot ? (
        <DashboardView base={`/dashboards/${slug}`} layout={layout} datasets={datasets} ctx={ctx} state={state} defs={ws.defs} updated={updated} />
      ) : (
        <p className="notice">No data has been published yet.</p>
      )}
    </>
  );
}
