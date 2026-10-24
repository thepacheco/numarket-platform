import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { withTenant } from "@numarket/db";
import { vocabFor } from "@numarket/db/demo/vocab";
import Icon from "@/components/Icon";
import { appsFor } from "@/lib/apps";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Apps" };

/* Engineering's home in the workspace: the apps built for this company. */
export default async function Apps() {
  const ctx = await requireTenant("definitions.view");
  if (!ctx.tenant.products.includes("engineering")) redirect("/available/engineering");
  const v = vocabFor(ctx.tenant.industry);
  const apps = appsFor(ctx.tenant.industry, v);
  const counts = await withTenant(ctx.tenant.id, async (db) =>
    Object.fromEntries((await db.query<{ app: string; status: string; n: number }>("select app, status, count(*)::int as n from app_records group by app, status")).rows.map((r) => [`${r.app}:${r.status}`, r.n])),
  );
  const waiting = counts["approvals:pending"] ?? 0;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Engineering</p>
          <h1>Apps</h1>
          <p>Small apps built for your company alone, on the same data and sign-in as everything else here. Each one replaces a spreadsheet, a paper form, or an email chain.</p>
        </div>
      </div>
      {ctx.tenant.isDemo && (
        <p className="notice" style={{ marginBottom: 16 }}>
          These three are examples. In your workspace, Engineering builds the apps your company needs, quoted as a project.
        </p>
      )}
      <div className="bento">
        {apps.map((a) => (
          <Link key={a.slug} href={`/apps/${a.slug}`} className="card c-4 app-card">
            <span className="app-ico">
              <Icon name={a.icon} />
            </span>
            <h2>{a.name}</h2>
            <p className="muted">{a.what}</p>
            <dl className="app-facts small">
              <dt>Replaces</dt>
              <dd>{a.replaces}</dd>
              <dt>Used by</dt>
              <dd>{a.who}</dd>
            </dl>
            <span className="app-foot small">
              {a.slug === "approvals" && waiting ? <span className="pill watch">{waiting} waiting for approval</span> : a.slug === "estimates" ? <span className="pill">{(counts["estimates:draft"] ?? 0) + (counts["estimates:sent"] ?? 0)} open</span> : <span className="pill">Ready</span>}
              <Icon name="arrow" />
            </span>
          </Link>
        ))}
        <div className="card c-12 app-request">
          <div>
            <h2>Need something else?</h2>
            <p className="muted" style={{ margin: 0 }}>
              Estimating, approvals, writing back into your systems, moving off old software, turning paper into data. Tell your numarket analyst what you do by hand today; Engineering quotes it as a project.
            </p>
          </div>
          <span className="pill brand">Quoted per project</span>
        </div>
      </div>
    </>
  );
}
