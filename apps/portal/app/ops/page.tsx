import Link from "next/link";
import { withPlatform, withTenant } from "@numarket/db";
import { TIER_LIMITS } from "@numarket/metering";
import { requireStaff } from "@/lib/guard";
import { ago } from "@/lib/data";
import { staffSignOut } from "./actions";

/* All tenants at a glance. Per-tenant numbers are read one tenant at a time
   through row-level security, the same as the tenant app. */
export default async function Ops() {
  const staff = await requireStaff();
  const tenants = await withPlatform(async (db) =>
    (
      await db.query<{ id: string; slug: string; name: string; tier: "insight" | "operate" | "command"; is_demo: boolean; status: string; hosts: string[] | null }>(
        `select t.id, t.slug, t.name, t.tier, t.is_demo, t.status, array_agg(h.host) filter (where h.host is not null) as hosts
         from tenants t left join tenant_hosts h on h.tenant_id = t.id group by t.id order by t.name`,
      )
    ).rows,
  );
  const rows = await Promise.all(
    tenants.map(async (t) => ({
      ...t,
      stats: await withTenant(t.id, async (db) => {
        const r = await db.query<{ members: number; open_flags: number; version: number | null; published: Date | null; pending: number }>(
          `select (select count(*)::int from memberships where status = 'active') as members,
                  (select count(*)::int from flags where status = 'open') as open_flags,
                  (select max(version) from snapshots) as version,
                  (select max(published_at) from snapshots) as published,
                  (select count(*)::int from input_entries where status = 'pending') as pending`,
        );
        return r.rows[0];
      }),
    })),
  );
  return (
    <main className="content" style={{ margin: "0 auto" }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">numarket ops console</p>
          <h1>Tenants</h1>
          <p>
            Signed in as {staff.user.name} ({staff.platformRole.replace("_", " ")}).
          </p>
        </div>
        <form action={staffSignOut}>
          <button className="btn btn-secondary" type="submit">
            Sign out
          </button>
        </form>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th scope="col">Tenant</th>
                <th scope="col">Plan</th>
                <th scope="col">Address</th>
                <th scope="col" className="num">
                  People
                </th>
                <th scope="col" className="num">
                  Open flags
                </th>
                <th scope="col">Last publish</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/ops/tenants/${t.slug}`}>
                      <b>{t.name}</b>
                    </Link>
                    <div className="small muted">
                      {t.slug}
                      {t.is_demo ? " · demo" : ""}
                    </div>
                  </td>
                  <td>{TIER_LIMITS[t.tier].name}</td>
                  <td className="small">{t.hosts?.join(", ") ?? `${t.slug}.<app domain>`}</td>
                  <td className="num tnum">{t.stats.members}</td>
                  <td className="num tnum">{t.stats.open_flags}</td>
                  <td className="small">
                    {t.stats.version ? `v${t.stats.version}, ${ago(t.stats.published!)}` : "Never"}
                    {t.stats.pending ? ` · ${t.stats.pending} waiting` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="small muted" style={{ marginTop: 16 }}>
        New-tenant provisioning, pipelines, and cost tracking arrive with the Snowflake worker (Stage B).
      </p>
    </main>
  );
}
