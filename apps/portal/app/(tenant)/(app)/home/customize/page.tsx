import type { Metadata } from "next";
import Link from "next/link";
import { withTenant } from "@numarket/db";
import { getHomeLayout, listDashboards } from "@numarket/db/repo/workspace";
import ActionForm, { Submit } from "@/components/ActionForm";
import { requireTenant } from "@/lib/guard";
import { catalog, cleanLayout, defaultLayout, PANELS } from "@/lib/home";
import { resetHome, saveHome } from "../../../actions";

export const metadata: Metadata = { title: "Customize Home" };

export default async function CustomizeHome() {
  const ctx = await requireTenant();
  const { dashboards, saved } = await withTenant(ctx.tenant.id, async (db) => ({ dashboards: await listDashboards(db), saved: await getHomeLayout(db, ctx.user.id) }), { userId: ctx.user.id });
  const cat = catalog(dashboards, ctx);
  const layout = saved ? cleanLayout(saved, ctx, cat) : defaultLayout(ctx, cat);
  const panels = PANELS.filter((p) => !p.needs || ctx.can(p.needs as never));
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            <Link href="/">Home</Link>
          </p>
          <h1>Customize your Home page</h1>
          <p>Pick what you want to see first. This only changes your own Home page.</p>
        </div>
      </div>
      <ActionForm action={saveHome} className="stack">
        {cat.kpis.length > 0 && (
          <section className="card">
            <h2>Key numbers (up to 8)</h2>
            <div className="pick-grid">
              {cat.kpis.map((w) => (
                <label key={w.id} className="pick">
                  <input type="checkbox" name="kpi" value={w.id} defaultChecked={layout.kpis.includes(w.id)} />
                  <span>
                    {w.title}
                    <small>{w.from}</small>
                  </span>
                </label>
              ))}
            </div>
          </section>
        )}
        {cat.charts.length > 0 && (
          <section className="card">
            <h2>Charts (up to 6)</h2>
            <div className="pick-grid">
              {cat.charts.map((w) => (
                <label key={w.id} className="pick">
                  <input type="checkbox" name="chart" value={w.id} defaultChecked={layout.charts.includes(w.id)} />
                  <span>
                    {w.title}
                    <small>{w.from}</small>
                  </span>
                </label>
              ))}
            </div>
          </section>
        )}
        <section className="card">
          <h2>Panels</h2>
          <div className="pick-grid">
            {panels.map((p) => (
              <label key={p.id} className="pick">
                <input type="checkbox" name="panel" value={p.id} defaultChecked={layout.panels.includes(p.id)} />
                <span>{p.title}</span>
              </label>
            ))}
          </div>
        </section>
        <div className="row">
          <Submit>Save my Home page</Submit>
          <Link href="/" className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </ActionForm>
      <ActionForm action={resetHome} className="row" >
        <Submit className="btn btn-ghost btn-sm">Go back to the default for my role</Submit>
      </ActionForm>
    </>
  );
}
