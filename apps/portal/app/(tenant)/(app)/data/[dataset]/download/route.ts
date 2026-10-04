import { scopeRows } from "@numarket/db/repo/snapshots";
import { withTenant } from "@numarket/db";
import { audit } from "@numarket/db/repo/audit";
import { listCatalog } from "@numarket/db/repo/workspace";
import { workspace } from "@/lib/data";
import { tenantOrThrow } from "@/lib/guard";
import { csvCell } from "@/lib/csv";

/* A full table as CSV, within the person's scope and the export policy. */
export async function GET(_: Request, { params }: { params: Promise<{ dataset: string }> }) {
  let auth;
  try {
    auth = await tenantOrThrow("dashboard.export");
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const { ctx, meta } = auth;
  if (!ctx.policy.exportRoles.includes(ctx.role)) return new Response("Downloads are turned off for your role.", { status: 403 });
  const { dataset } = await params;
  const t = (await withTenant(ctx.tenant.id, listCatalog)).find((x) => x.dataset === dataset);
  if (!t) return new Response("Not found", { status: 404 });
  const ws = await workspace(ctx);
  const rows = scopeRows(ws.snapshot?.datasets[dataset], ctx.scope);
  const fields = Object.keys(rows[0] ?? {});
  await withTenant(ctx.tenant.id, (db) => audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: ctx.tenant.isDemo ? "demo" : "user", action: "export.table", target: t.name, detail: { rows: rows.length }, ip: meta.ip }));
  const body = [fields.map((f) => f.toUpperCase()).join(","), ...rows.map((r) => fields.map((f) => csvCell(r[f])).join(","))].join("\n");
  return new Response(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${t.name.toLowerCase()}.csv"`, "cache-control": "no-store" } });
}
