import { withTenant } from "@numarket/db";
import { audit } from "@numarket/db/repo/audit";
import { getBranding } from "@numarket/db/repo/admin";
import { latestSnapshot, snapshotVersion } from "@numarket/db/repo/snapshots";
import { getReport, reportVersions } from "@numarket/db/repo/workspace";
import { asOfMonth } from "@/components/Dashboard";
import { renderReportPdf } from "@/components/pdf/ReportPdf";
import { reportVisible } from "@/lib/data";
import { tenantOrThrow } from "@/lib/guard";

/* The report as a PDF. A published version uses the numbers frozen with it;
   without ?v= the latest published version is used, or the draft if none.
   Downloads follow the tenant's export policy and are audit-logged. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  let auth;
  try {
    auth = await tenantOrThrow("report.view");
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const { ctx, meta } = auth;
  if (!ctx.policy.exportRoles.includes(ctx.role)) return new Response("Downloads are turned off for your role.", { status: 403 });
  const { slug } = await params;
  const v = new URL(req.url).searchParams.get("v");
  const tz = ctx.tenant.timezone;

  const d = await withTenant(
    ctx.tenant.id,
    async (db) => {
      const report = await getReport(db, slug);
      if (!report || !reportVisible(report.layout, ctx)) return null;
      const versions = await reportVersions(db, slug);
      const chosen = (v ? versions.find((x) => String(x.version) === v) : versions[0]) ?? null;
      const snap = chosen ? await snapshotVersion(db, chosen.snapshot_version) : await latestSnapshot(db);
      const branding = await getBranding(db);
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: ctx.tenant.isDemo ? "demo" : "user", action: "export.pdf", target: slug, detail: { version: chosen?.version ?? "draft" }, ip: meta.ip });
      return { report, chosen, snap, branding };
    },
    { userId: ctx.user.id },
  );
  if (!d || !d.snap) return new Response("Not found", { status: 404 });

  const ref = new Date(d.chosen?.published_at ?? d.snap.published_at);
  const days = d.report.layout.period === "two weeks" ? 13 : 6;
  const start = new Date(ref.getTime() - days * 86_400_000);
  const day = (x: Date, year = false) => x.toLocaleDateString("en-US", { month: "short", day: "numeric", year: year ? "numeric" : undefined, timeZone: tz });
  const periodLabel = d.report.layout.period ? `${d.report.layout.period === "week" ? "Week of " : ""}${day(start)} – ${day(ref, true)}` : day(ref, true);
  const stamp = (x: Date | string) => new Date(x).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz });
  const versionLine = d.chosen ? `Version ${d.chosen.version} · published ${stamp(d.chosen.published_at)}${d.chosen.by_name ? ` by ${d.chosen.by_name}` : ""}` : `Draft · data as of ${stamp(d.snap.published_at)}`;
  const b = d.branding;

  const pdf = await renderReportPdf({
    title: d.report.title,
    layout: d.report.layout,
    commentary: d.chosen ? d.chosen.commentary : d.report.draft,
    datasets: d.snap.datasets,
    scope: ctx.scope,
    asOfMonth: asOfMonth(d.snap.published_at, tz),
    periodLabel,
    versionLine,
    brand: { name: b?.display_name ?? ctx.tenant.name, logo: b?.logo_text ?? "", primary: b?.primary_color ?? "#22577A", footer: b?.report_footer ?? null },
  });
  const name = `${slug}${d.chosen ? `-v${d.chosen.version}` : "-draft"}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${name}"`, "cache-control": "private, no-store" },
  });
}
