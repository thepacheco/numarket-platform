import "server-only";
import type { Block, DashboardLayout } from "@numarket/blocks";
import type { TenantContext } from "@numarket/auth";
import type { HomeLayout } from "@numarket/db/repo/workspace";

/* Home is each person's own page (Spec §12.3). They choose key numbers and
   charts from the workspace's dashboards, plus a few panels. Nobody builds
   dashboards here; they pick from what numarket has set up. */

export type Widget = { id: string; title: string; from: string; block: Block };
export const PANELS = [
  { id: "review", title: "Latest Insight Review", needs: "actions.view" },
  { id: "attention", title: "Data that needs attention", needs: "flags.view" },
  { id: "entries", title: "Your entries", needs: "input.submit" },
  { id: "freshness", title: "Your data", needs: null },
  { id: "reports", title: "Reports", needs: "report.view" },
] as const;

export function catalog(dashboards: { slug: string; title: string; layout: unknown }[], ctx: TenantContext) {
  const kpis: Widget[] = [];
  const charts: Widget[] = [];
  if (!ctx.can("dashboard.view")) return { kpis, charts };
  const seen = new Set<string>();
  for (const d of dashboards) {
    const l = d.layout as DashboardLayout;
    if (ctx.scope && l.wholeCompany) continue;
    for (const p of l.pages)
      p.rows.forEach((row, i) =>
        row.forEach((b, j) => {
          const key = JSON.stringify(b);
          if (seen.has(key)) return;
          seen.add(key);
          const w = { id: `${d.slug}.${p.slug}.${i}.${j}`, title: b.title, from: `${d.title} · ${p.title}`, block: b };
          if (b.type === "kpi") kpis.push(w);
          else if (b.type === "trend" || b.type === "columns" || b.type === "bar" || b.type === "stacked") charts.push(w);
        }),
      );
  }
  return { kpis, charts };
}

const byTitle = (list: Widget[], titles: string[]) => titles.map((t) => list.find((w) => w.title === t)?.id).filter((x): x is string => !!x);

export function defaultLayout(ctx: TenantContext, cat: ReturnType<typeof catalog>): HomeLayout {
  const panels = PANELS.filter((p) => !p.needs || ctx.can(p.needs as never)).map((p) => p.id as string);
  if (!ctx.can("dashboard.view")) return { kpis: [], charts: [], panels: panels.filter((p) => p !== "reports") };
  if (ctx.scope)
    return {
      kpis: byTitle(cat.kpis, ["Job cost in period", "Cost performance", "Cost vs. budget for work done", "Open RFIs"]),
      charts: byTitle(cat.charts, ["Budget for work done vs. actual cost", "Change orders by cause"]),
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
