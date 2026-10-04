import type { Metadata } from "next";
import { withTenant } from "@numarket/db";
import { usageCounts } from "@numarket/db/repo/admin";
import { manualRefreshesToday, recentRuns } from "@numarket/db/repo/snapshots";
import { TIER_LIMITS, updateNowLimit } from "@numarket/metering";
import { fmtDateTime } from "@/lib/data";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Usage & plan" };

const PRODUCT: Record<string, string> = { foundation: "Foundation", workspace: "Workspace", insight: "Insight Review", engineering: "Engineering" };
const KIND: Record<string, string> = { scheduled: "Scheduled", manual: "Update now", reset: "Initial load" };

export default async function Usage() {
  const ctx = await requireTenant("usage.view");
  const lim = TIER_LIMITS[ctx.tenant.tier];
  const { counts, runs, today } = await withTenant(
    ctx.tenant.id,
    async (db) => ({ counts: await usageCounts(db), runs: await recentRuns(db, 10), today: await manualRefreshesToday(db, ctx.tenant.timezone) }),
    { userId: ctx.user.id },
  );
  const manualLimit = updateNowLimit(ctx.tenant.tier, ctx.tenant.isDemo);
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Usage &amp; plan</h1>
          <p>
            {lim.name} plan ({lim.size}): {ctx.tenant.products.map((p) => PRODUCT[p] ?? p).join(", ")}.
          </p>
        </div>
      </div>
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3>People</h3>
          <p className="b-kpi-v tnum">{counts.users}</p>
          <p className="small muted" style={{ margin: 0 }}>
            Plan limit: {lim.users}. No per-user fees.
          </p>
        </div>
        <div className="card">
          <h3>Sources</h3>
          <p className="b-kpi-v tnum">{counts.sources}</p>
          <p className="small muted" style={{ margin: 0 }}>
            Plan limit: {lim.sources}.
          </p>
        </div>
        <div className="card">
          <h3>Update now, today</h3>
          <p className="b-kpi-v tnum">
            {today} <span className="small muted">of {manualLimit}</span>
          </p>
          <p className="small muted" style={{ margin: 0 }}>
            Resets at midnight. Scheduled updates: {lim.schedule.label.toLowerCase()}.
          </p>
        </div>
      </div>
      <div className="grid-2" style={{ alignItems: "start" }}>
        <section className="card">
          <h2>What your plan includes</h2>
          <dl className="kv">
            <dt>Scheduled updates</dt>
            <dd>{lim.schedule.label}</dd>
            <dt>Update now</dt>
            <dd>{lim.updateNowPerDay} per day</dd>
            <dt>Ask Your Data</dt>
            <dd>{lim.askQuestionsPerMonth ? `${lim.askQuestionsPerMonth.toLocaleString("en-US")} questions a month` : "Custom"}</dd>
            <dt>Largest table</dt>
            <dd>{lim.rowVolume}</dd>
            <dt>Alert rules</dt>
            <dd>{lim.alertRules ?? "Custom"}</dd>
            <dt>Scheduled reports</dt>
            <dd>{lim.scheduledReports ?? "Custom"}</dd>
            <dt>Platform usage</dt>
            <dd>{lim.platformAllowance}</dd>
          </dl>
          <p className="small muted" style={{ margin: "12px 0 0" }}>
            {ctx.tenant.isDemo ? "The demo runs on sample data, so it uses no platform allowance." : "Usage against your allowance is measured nightly once your data pipeline is connected. You'll get an email at 85%."}
          </p>
        </section>
        <section className="card">
          <h2>Recent updates</h2>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Type</th>
                  <th scope="col" className="num">
                    New entries
                  </th>
                  <th scope="col" className="num">
                    Rows published
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td className="small">{fmtDateTime(r.started_at, ctx.tenant.timezone)}</td>
                    <td className="small">
                      {KIND[r.kind] ?? r.kind}
                      {r.by_name ? ` · ${r.by_name}` : ""}
                    </td>
                    <td className="num tnum">{r.entries_applied}</td>
                    <td className="num tnum">{r.rows_published}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
