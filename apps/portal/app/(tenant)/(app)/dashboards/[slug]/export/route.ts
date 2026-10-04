import { visibleRows, type DashboardLayout } from "@numarket/blocks";
import { withTenant } from "@numarket/db";
import { audit } from "@numarket/db/repo/audit";
import { getDashboard } from "@numarket/db/repo/workspace";
import { cleanFilters } from "@/components/Dashboard";
import { workspace } from "@/lib/data";
import { tenantOrThrow } from "@/lib/guard";

/* CSV export of a dashboard's tables, subject to the tenant's export policy
   and the user's data scope (Spec §4.3, §12.3). Logged in the audit log. */
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
  const ws = await workspace(ctx);
  const layout = dash.layout as DashboardLayout;
  const datasets = ws.snapshot?.datasets ?? {};
  const filters = cleanFilters(layout, datasets, ctx, Object.fromEntries(new URL(req.url).searchParams));
  const tables = layout.rows.flat().filter((b) => b.type === "table");
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    const safe = /^[=+\-@]/.test(s) ? "'" + s : s; // keep spreadsheets from running formulas
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const parts: string[] = [];
  for (const t of tables) {
    if (t.type !== "table") continue;
    const rows = visibleRows(datasets, t.dataset, ctx.scope, filters);
    parts.push(esc(t.title));
    parts.push(t.columns.map((c) => esc(c.label)).join(","));
    for (const r of rows) parts.push(t.columns.map((c) => esc(r[c.field])).join(","));
    parts.push("");
  }
  await withTenant(ctx.tenant.id, (db) => audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: ctx.tenant.isDemo ? "demo" : "user", action: "export.csv", target: slug, detail: { filters }, ip: meta.ip }));
  return new Response(parts.join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${slug}-v${ws.snapshot?.version ?? 0}.csv"`, "cache-control": "no-store" },
  });
}
