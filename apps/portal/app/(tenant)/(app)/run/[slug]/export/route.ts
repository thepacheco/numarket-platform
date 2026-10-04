import type { DataReportDef } from "@numarket/blocks";
import { withTenant } from "@numarket/db";
import { audit } from "@numarket/db/repo/audit";
import { getBranding } from "@numarket/db/repo/admin";
import { getDataReport } from "@numarket/db/repo/workspace";
import { asOfMonth } from "@/components/Dashboard";
import { renderTablePdf } from "@/components/pdf/TablePdf";
import { workspace } from "@/lib/data";
import { run, runState } from "@/lib/dataReport";
import { tenantOrThrow } from "@/lib/guard";
import { csvCell } from "@/lib/csv";

/* Download a data report as CSV or PDF, with the same filters the person ran
   it with. Subject to the export policy and recorded in the audit log. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  let auth;
  try {
    auth = await tenantOrThrow("dashboard.export");
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const { ctx, meta } = auth;
  if (!ctx.policy.exportRoles.includes(ctx.role)) return new Response("Downloads are turned off for your role.", { status: 403 });
  const { slug } = await params;
  const url = new URL(req.url);
  const r = await withTenant(ctx.tenant.id, (db) => getDataReport(db, slug));
  if (!r) return new Response("Not found", { status: 404 });
  const def = r.definition as DataReportDef;
  if (ctx.scope && def.wholeCompany) return new Response("Not found", { status: 404 });
  const ws = await workspace(ctx);
  const tz = ctx.tenant.timezone;
  const st = runState(def, ws.snapshot?.datasets ?? {}, ctx, Object.fromEntries(url.searchParams), asOfMonth(ws.snapshot?.published_at, tz));
  const out = run(def, ws.snapshot?.datasets ?? {}, ctx, st);
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "csv";
  const branding = await withTenant(ctx.tenant.id, async (db) => {
    await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: ctx.tenant.isDemo ? "demo" : "user", action: `export.${format}`, target: `run/${slug}`, detail: { group: st.grouping.key, range: st.range?.current ?? null, job: st.job ?? null }, ip: meta.ip });
    return getBranding(db);
  });
  const jobName = st.jobs.find((j) => j.v === st.job)?.l;
  const filters = [st.grouping.label, st.range ? st.range.label : "As of today", jobName ?? (def.filters.job ? "All jobs" : null)].filter(Boolean).join(" · ");
  const name = `${slug}-${st.grouping.key}`;
  if (format === "pdf") {
    const pdf = await renderTablePdf({
      title: r.title, filters, company: branding?.display_name ?? ctx.tenant.name, primary: branding?.primary_color ?? "#22577A",
      columns: st.grouping.columns, rows: out.rows, totals: out.totals,
      generated: new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz }),
    });
    return new Response(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${name}.pdf"`, "cache-control": "private, no-store" } });
  }
  const lines = [st.grouping.columns.map((c) => csvCell(c.label)).join(","), ...out.rows.map((row) => st.grouping.columns.map((c) => csvCell(row[c.field])).join(","))];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}.csv"`, "cache-control": "no-store" } });
}
