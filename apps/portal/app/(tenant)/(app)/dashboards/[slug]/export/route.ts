import { isDated, statementData, tableRows, visibleRows, type DashboardLayout } from "@numarket/blocks";
import { withTenant } from "@numarket/db";
import { audit } from "@numarket/db/repo/audit";
import { getDashboard } from "@numarket/db/repo/workspace";
import { asOfMonth, dashState } from "@/components/Dashboard";
import { workspace } from "@/lib/data";
import { tenantOrThrow } from "@/lib/guard";

/* CSV export of the tables on one dashboard page, with the same period, job,
   and scope the person is looking at. Subject to the tenant's export policy
   (Spec §4.3) and recorded in the audit log. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  let auth;
  try {
    auth = await tenantOrThrow("dashboard.export");
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const { ctx, meta } = auth;
  if (!ctx.policy.exportRoles.includes(ctx.role)) return new Response("Exports are turned off for your role.", { status: 403 });
  const { slug } = await params;
  const dash = await withTenant(ctx.tenant.id, (db) => getDashboard(db, slug));
  if (!dash) return new Response("Not found", { status: 404 });
  const layout = dash.layout as DashboardLayout;
  if (ctx.scope && layout.wholeCompany) return new Response("Not found", { status: 404 });
  const ws = await workspace(ctx);
  const datasets = ws.snapshot?.datasets ?? {};
  const state = dashState(layout, datasets, ctx, Object.fromEntries(new URL(req.url).searchParams), asOfMonth(ws.snapshot?.published_at, ctx.tenant.timezone));
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    const safe = /^[=+\-@]/.test(s) ? "'" + s : s; // keep spreadsheets from running formulas
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const parts: string[] = [];
  for (const b of state.page.rows.flat()) {
    const dated = isDated(datasets, b.dataset);
    const filters = { eq: { job: state.job }, range: dated ? state.range?.current : null };
    if (b.type === "table") {
      const rows = tableRows(b, visibleRows(datasets, b.dataset, ctx.scope, filters));
      parts.push(esc(b.title), b.columns.map((c) => esc(c.label)).join(","));
      for (const r of rows) parts.push(b.columns.map((c) => esc(r[c.field])).join(","));
      parts.push("");
    } else if (b.type === "statement") {
      const prior = dated && state.range?.prior ? visibleRows(datasets, b.dataset, ctx.scope, { eq: { job: state.job }, range: state.range.prior }) : null;
      const lines = statementData(b, visibleRows(datasets, b.dataset, ctx.scope, filters), prior);
      parts.push(esc(`${b.title} (${state.range?.label ?? ""})`), "Line,This period,Prior period");
      for (const l of lines) parts.push([esc(l.label), l.kind === "group" ? "" : Math.round(l.current), l.kind === "group" || l.prior === null ? "" : Math.round(l.prior)].join(","));
      parts.push("");
    }
  }
  await withTenant(ctx.tenant.id, (db) => audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: ctx.tenant.isDemo ? "demo" : "user", action: "export.csv", target: `${slug}/${state.page.slug}`, detail: { range: state.range?.current ?? null, job: state.job ?? null }, ip: meta.ip }));
  return new Response(parts.join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${slug}-${state.page.slug}.csv"`, "cache-control": "no-store" },
  });
}
