import type { Metadata } from "next";
import Link from "next/link";
import { withTenant } from "@numarket/db";
import { listSources } from "@numarket/db/repo/workspace";
import { ago, fmtTime, workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import HubNav from "@/components/HubNav";

export const metadata: Metadata = { title: "Sources" };

const STATUS: Record<string, string> = { healthy: "Healthy", reconnect: "Reconnect needed", syncing: "First copy tonight", paused: "Paused" };

/* Every connected source (Spec §12.2). Connecting new sources arrives with
   the connector framework in Stage B; the wizard is shown but not live yet. */
export default async function Sources() {
  const ctx = await requireTenant("sources.view");
  const ws = await workspace(ctx);
  const sources = await withTenant(ctx.tenant.id, listSources);
  const next = fmtTime(ws.nextUpdate, ctx.tenant.timezone);
  return (
    <>
      <HubNav hub="health" current="/sources" ctx={ctx} />
      <div className="page-head">
        <div>
          <p className="eyebrow">Foundation · data health</p>
          <h1>Sources</h1>
          <p>Each tool your data comes from. Every connection is read-only: it copies data out and can&apos;t change anything in your systems.</p>
        </div>
        <Link href="/sources/connect" className="btn btn-primary">
          Connect a source
        </Link>
      </div>
      <ul className="list">
        {sources.map((s) => (
          <li key={s.id} className="item">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <h3>{s.name}</h3>
                <p className="small muted" style={{ margin: "2px 0 0" }}>
                  {s.connection}
                  {s.tier !== "internal" ? ` · Standard connector` : ""}
                </p>
              </div>
              <span className={`pill ${s.status}`}>{STATUS[s.status] ?? s.status}</span>
            </div>
            <dl className="kv" style={{ marginTop: 10 }}>
              <dt>Last update</dt>
              <dd>{s.last_sync_at ? ago(s.last_sync_at) : "Not yet"}</dd>
              <dt>Next update</dt>
              <dd>{s.status === "reconnect" ? "Paused until reconnected" : s.tier === "internal" ? `Entries publish at the ${next} update` : next}</dd>
              {s.tier !== "internal" && (
                <>
                  <dt>Rows copied</dt>
                  <dd className="tnum">{Number(s.rows_loaded).toLocaleString("en-US")}</dd>
                </>
              )}
              <dt>What syncs</dt>
              <dd>{s.streams.join(", ")}</dd>
            </dl>
            {s.status === "reconnect" && (
              <p className="notice risk" style={{ marginTop: 10 }}>
                The connection expired. {ctx.can("sources.connect") ? "Reconnect it to resume updates." : "Your admin has been notified."} Dashboards keep showing the last good data from this source.
              </p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
