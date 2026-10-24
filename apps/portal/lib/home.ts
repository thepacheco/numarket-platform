import "server-only";
import type { Block } from "@numarket/blocks";
import { blockCatalog, isChart, type CatalogItem } from "./catalog";
import type { TenantContext } from "@numarket/auth";
import type { HomeLayout } from "@numarket/db/repo/workspace";
import { vocabFor } from "@numarket/db/demo/vocab";

/* Home is each person's own page (Spec §12.3). They choose key numbers and
   charts from the workspace's dashboards, plus a few panels. Nobody builds
   dashboards here; they pick from what numarket has set up. */

export type Widget = { id: string; title: string; from: string; block: Block };
export const PANELS = [
  { id: "attention", title: "Needs you (flags, action items, waiting entries)", needs: null },
  { id: "review", title: "Your analyst's latest review", needs: "actions.view" },
  { id: "entries", title: "Your entries", needs: "input.submit" },
  { id: "freshness", title: "Your data (last and next update)", needs: null },
  { id: "reports", title: "Reports", needs: "report.view" },
] as const;

export function catalog(dashboards: { slug: string; title: string; layout: unknown }[], ctx: TenantContext) {
  const all = ctx.can("dashboard.view") ? blockCatalog(dashboards, ctx) : [];
  const toWidget = (c: CatalogItem): Widget => ({ id: c.id, title: c.title, from: c.from, block: c.block });
  return { kpis: all.filter((c) => c.block.type === "kpi").map(toWidget), charts: all.filter((c) => isChart(c.block)).map(toWidget) };
}

const byTitle = (list: Widget[], titles: string[]) => titles.map((t) => list.find((w) => w.title === t)?.id).filter((x): x is string => !!x);

export function defaultLayout(ctx: TenantContext, cat: ReturnType<typeof catalog>): HomeLayout {
  const v = vocabFor(ctx.tenant.industry);
  const panels = PANELS.filter((p) => !p.needs || ctx.can(p.needs as never)).map((p) => p.id as string);
  if (!ctx.can("dashboard.view")) return { kpis: [], charts: [], panels: panels.filter((p) => p !== "reports") };
  if (ctx.scope)
    return {
      kpis: byTitle(cat.kpis, [`${v.Job} cost in period`, "Cost performance", "Cost vs. budget for work done", v.rfiShort]),
      charts: byTitle(cat.charts, ["Budget for work done vs. actual cost", `${v.ChangeOrders} by cause`]),
      panels: panels.filter((p) => p !== "review"),
    };
  return {
    kpis: byTitle(cat.kpis, ["Revenue", "Net income", "Cash on hand", "Cost performance"]),
    charts: byTitle(cat.charts, ["Revenue and costs by month", "Budget for work done vs. actual cost"]),
    panels,
  };
}

/** Keep only choices that still exist and that this person may see. */
export function cleanLayout(l: HomeLayout, ctx: TenantContext, cat: ReturnType<typeof catalog>): HomeLayout {
  const k = new Set(cat.kpis.map((w) => w.id));
  const c = new Set(cat.charts.map((w) => w.id));
  const p = new Set(PANELS.filter((x) => !x.needs || ctx.can(x.needs as never)).map((x) => x.id as string));
  return { kpis: l.kpis.filter((x) => k.has(x)).slice(0, 8), charts: l.charts.filter((x) => c.has(x)).slice(0, 6), panels: l.panels.filter((x) => p.has(x)) };
}
