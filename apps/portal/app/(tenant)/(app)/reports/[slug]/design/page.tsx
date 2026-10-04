import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { withTenant } from "@numarket/db";
import { getReport, listDashboards } from "@numarket/db/repo/workspace";
import ActionForm, { Submit } from "@/components/ActionForm";
import ReportBuilder from "@/components/ReportBuilder";
import { blockCatalog, isChart } from "@/lib/catalog";
import { jobsInScope, reportVisible, workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { companyDatasets, toDesign } from "@/lib/reportDesign";
import { deleteReportAction, saveReportDesign } from "../../../../actions";

export const metadata: Metadata = { title: "Design report" };

export default async function DesignReport({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await requireTenant("report.edit");
  const { slug } = await params;
  const { report, dashboards } = await withTenant(ctx.tenant.id, async (db) => ({ report: await getReport(db, slug), dashboards: await listDashboards(db) }), { userId: ctx.user.id });
  if (!report || !reportVisible(report.layout, ctx)) notFound();
  const ws = await workspace(ctx);
  const cat = blockCatalog(dashboards, ctx);
  const company = companyDatasets(dashboards);
  const opt = (c: (typeof cat)[number]) => ({ id: c.id, title: c.title, from: c.from, company: company.has(c.block.dataset), block: c.block as unknown as { type: string; title: string; dataset: string } });
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            <Link href="/reports">Status reports</Link> · <Link href={`/reports/${slug}`}>{report.title}</Link>
          </p>
          <h1>Design the report</h1>
          <p>Choose what goes in it and in what order. Numbers and charts fill in from your data every time; text sections are written by your team.</p>
        </div>
        {ctx.can("report.publish") && (
          <ActionForm action={deleteReportAction}>
            <input type="hidden" name="slug" value={slug} />
            <Submit className="btn btn-ghost btn-sm">Delete this report</Submit>
          </ActionForm>
        )}
      </div>
      <ReportBuilder
        slug={slug}
        initial={toDesign(report.title, report.description, report.layout)}
        kpis={cat.filter((c) => c.block.type === "kpi").map(opt)}
        blocks={cat.filter((c) => isChart(c.block) || c.block.type === "table" || c.block.type === "statement").map(opt)}
        jobs={jobsInScope(ws.snapshot?.datasets, ctx)}
        action={saveReportDesign}
        scoped={!!ctx.scope}
      />
    </>
  );
}
