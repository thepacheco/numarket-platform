import "server-only";
import { blockId, type Block, type DashboardLayout } from "@numarket/blocks";
import type { TenantContext } from "@numarket/auth";

/* Every building block on the workspace's dashboards, by stable id. Home and
   the report builder pick from this list; nobody writes new block types
   here (that's Engineering). Company-wide blocks are left out for people
   whose data scope is limited. */

export type CatalogItem = { id: string; title: string; from: string; block: Block; wholeCompany: boolean };

export function blockCatalog(dashboards: { slug: string; title: string; layout: unknown }[], ctx: TenantContext) {
  const out: CatalogItem[] = [];
  const seen = new Set<string>();
  if (!ctx.can("dashboard.view") && !ctx.can("report.edit")) return out;
  for (const d of dashboards) {
    const l = d.layout as DashboardLayout;
    if (ctx.scope && l.wholeCompany) continue;
    for (const p of l.pages)
      for (const row of p.rows)
        for (const b of row) {
          const id = blockId(b);
          if (seen.has(id)) continue;
          seen.add(id);
          out.push({ id, title: b.title, from: `${d.title} · ${p.title}`, block: b, wholeCompany: !!l.wholeCompany });
        }
  }
  return out;
}

export const isChart = (b: Block) => b.type === "trend" || b.type === "columns" || b.type === "bar" || b.type === "stacked";
