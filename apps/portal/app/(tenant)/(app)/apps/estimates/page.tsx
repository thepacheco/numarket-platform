import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { fmt } from "@numarket/blocks";
import { withTenant } from "@numarket/db";
import { estimateTotals, type EstimateData } from "@numarket/db/demo/apps";
import { vocabFor } from "@numarket/db/demo/vocab";
import { listAppRecords } from "@numarket/db/repo/workspace";
import Icon from "@/components/Icon";
import { appsFor } from "@/lib/apps";
import { ago, workspace } from "@/lib/data";
import { pricingHistory } from "@/lib/estimates";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Estimates" };

const STATUS: Record<string, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "" },
  sent: { label: "Sent", tone: "info" },
  won: { label: "Won", tone: "good" },
  lost: { label: "Lost", tone: "risk" },
};

export default async function Estimates() {
  const ctx = await requireTenant("definitions.view");
  if (!ctx.tenant.products.includes("engineering")) redirect("/available/engineering");
  const v = vocabFor(ctx.tenant.industry);
  const app = appsFor(ctx.tenant.industry, v).find((a) => a.slug === "estimates")!;
  const ws = await workspace(ctx);
  const records = await withTenant(ctx.tenant.id, (db) => listAppRecords(db, "estimates"));
  const rows = records.map((r) => ({ ...r, e: r.data as EstimateData, total: estimateTotals(r.data as EstimateData).total }));
  const open = rows.filter((r) => r.status === "draft" || r.status === "sent");
  const won = rows.filter((r) => r.status === "won");
  const decided = rows.filter((r) => r.status === "won" || r.status === "lost");
  const hist = pricingHistory(ws.snapshot?.datasets);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            <Link href="/apps">Apps</Link>
          </p>
          <h1>{app.name}</h1>
          <p>{app.what}</p>
        </div>
        {ctx.can("input.submit") && (
          <Link className="btn btn-primary" href="/apps/estimates/new">
            <Icon name="plus" /> New {ctx.tenant.industry === "services" ? "proposal" : "estimate"}
          </Link>
        )}
      </div>

      <div className="bento" style={{ marginBottom: 18 }}>
        <div className="card c-4 stat-card">
          <span className="small muted">Open</span>
          <b className="tnum">{fmt(open.reduce((t, r) => t + r.total, 0), "money")}</b>
          <span className="small muted">
            {open.length} {open.length === 1 ? "estimate" : "estimates"} in draft or sent
          </span>
        </div>
        <div className="card c-4 stat-card">
          <span className="small muted">Win rate</span>
          <b className="tnum">{decided.length ? fmt(won.length / decided.length, "pct") : "—"}</b>
          <span className="small muted">{decided.length ? `${won.length} won of ${decided.length} decided` : "None decided yet"}</span>
        </div>
        <div className="card c-4 stat-card tone-card">
          <span className="small muted">From your {v.jobs}</span>
          {hist ? (
            <>
              <b className="tnum">{hist.suggested}% contingency</b>
              <span className="small muted">
                {hist.over ? `${hist.over} of ${hist.jobs} ${v.jobs} are over budget for the work done${hist.worst ? ` (${hist.worst})` : ""}.` : `All ${hist.jobs} ${v.jobs} are on or under budget.`}
              </span>
            </>
          ) : (
            <span className="small muted">Appears once {v.jobs} have data.</span>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="notice">No estimates yet.</p>
      ) : (
        <ul className="list">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/apps/estimates/${r.id}`} className="item row" style={{ justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h3>{r.e.name}</h3>
                  <span className="small muted">
                    {r.e.customer} · {r.by_name ?? "Someone"} · updated {ago(r.updated_at)}
                  </span>
                </div>
                <div className="row" style={{ gap: 10 }}>
                  <b className="tnum">{fmt(r.total, "money")}</b>
                  <span className={`pill ${STATUS[r.status]?.tone ?? ""}`}>{STATUS[r.status]?.label ?? r.status}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
