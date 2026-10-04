import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { DashboardLayout } from "@numarket/blocks";
import { withTenant } from "@numarket/db";
import { getDashboard } from "@numarket/db/repo/workspace";
import { cleanFilters, DashboardView } from "@/components/Dashboard";
import Icon from "@/components/Icon";
import { fmtDateTime, workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireTenant("dashboard.view");
  const { slug } = await params;
  const dash = await withTenant(ctx.tenant.id, (db) => getDashboard(db, slug));
  if (!dash) notFound();
  const ws = await workspace(ctx);
  const layout = dash.layout as DashboardLayout;
  const datasets = ws.snapshot?.datasets ?? {};
  const filters = cleanFilters(layout, datasets, ctx, await searchParams);
  const updated = ws.snapshot ? fmtDateTime(ws.snapshot.published_at, ctx.tenant.timezone) : "";
  const canExport = ctx.can("dashboard.export") && ctx.policy.exportRoles.includes(ctx.role);
  const q = new URLSearchParams(filters as Record<string, string>).toString();
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            <Link href="/dashboards">Dashboards</Link>
          </p>
          <h1>{dash.title}</h1>
          <p>{dash.description}</p>
        </div>
        {canExport && (
          <a className="btn btn-secondary" href={`/dashboards/${slug}/export${q ? `?${q}` : ""}`}>
            <Icon name="download" /> Export CSV
          </a>
        )}
      </div>
      {ws.snapshot ? (
        <DashboardView layout={layout} datasets={datasets} ctx={ctx} filters={filters} defs={ws.defs} updated={updated} />
      ) : (
        <p className="notice">No data has been published yet.</p>
      )}
    </>
  );
}
