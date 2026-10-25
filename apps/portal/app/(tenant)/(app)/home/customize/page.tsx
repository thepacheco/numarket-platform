import type { Metadata } from "next";
import { pinBase } from "@/lib/pinView";
import Link from "next/link";
import { withTenant } from "@numarket/db";
import { getHomeLayout, listDashboards } from "@numarket/db/repo/workspace";
import ActionForm, { Submit } from "@/components/ActionForm";
import HomeCustomizer from "@/components/HomeCustomizer";
import { requireTenant } from "@/lib/guard";
import { catalog, cleanLayout, defaultLayout, PANELS } from "@/lib/home";
import { resetHome, saveHome } from "../../../actions";

export const metadata: Metadata = { title: "Customize Home" };

export default async function CustomizeHome() {
  const ctx = await requireTenant();
  const { dashboards, saved } = await withTenant(ctx.tenant.id, async (db) => ({ dashboards: await listDashboards(db), saved: await getHomeLayout(db, ctx.user.id) }), { userId: ctx.user.id });
  const cat = catalog(dashboards, ctx);
  const layout = saved ? cleanLayout(saved, ctx, cat) : defaultLayout(ctx, cat);
  const panels = PANELS.filter((p) => !p.needs || ctx.can(p.needs as never)).map((p) => ({ id: p.id as string, title: p.title as string }));
  const pick = (w: { id: string; title: string; from: string }) => ({ id: w.id, title: w.title, from: w.from });
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            <Link href="/">Home</Link>
          </p>
          <h1>Customize your Home page</h1>
          <p>Choose what you see first, and drag to put it in order. You can also pin any number or chart straight from a dashboard. This only changes your own Home page.</p>
        </div>
        <ActionForm action={resetHome}>
          <Submit className="btn btn-ghost btn-sm">Go back to the default for my role</Submit>
        </ActionForm>
      </div>
      <HomeCustomizer kpis={cat.kpis.map(pick)} charts={cat.charts.map(pick)} panels={panels} initial={{ ...layout, kpis: layout.kpis.map(pinBase), charts: layout.charts.map(pinBase) }} action={saveHome} />
    </>
  );
}
