import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { fmt } from "@numarket/blocks";
import { withTenant } from "@numarket/db";
import type { ApprovalData } from "@numarket/db/demo/apps";
import { packFor } from "@numarket/db/demo/packs";
import { getScreen, listAppRecords } from "@numarket/db/repo/workspace";
import ActionForm, { Submit } from "@/components/ActionForm";
import ApprovalRequestForm from "@/components/ApprovalRequestForm";
import Icon from "@/components/Icon";
import { appsFor } from "@/lib/apps";
import { ago, jobsInScope, workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { decideApproval, requestApproval } from "../../../actions";

export const metadata: Metadata = { title: "Approvals" };

export default async function Approvals({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const ctx = await requireTenant("definitions.view");
  if (!ctx.tenant.products.includes("engineering")) redirect("/available/engineering");
  const pack = packFor(ctx.tenant.industry);
  const v = pack.vocab;
  const app = appsFor(ctx.tenant.industry, v).find((a) => a.slug === "approvals")!;
  const { show } = await searchParams;
  const ws = await workspace(ctx);
  const jobs = jobsInScope(ws.snapshot?.datasets, ctx);
  const jobName = Object.fromEntries(jobs.map((j) => [j.code, j.name]));
  const { records, screen } = await withTenant(ctx.tenant.id, async (db) => ({ records: await listAppRecords(db, "approvals", 100), screen: await getScreen(db, pack.screenSlugs.co) }));
  /* people with a data scope see requests for their own jobs only */
  const visible = records.filter((r) => !ctx.scope || ctx.scope.values.includes(String((r.data as ApprovalData).job)));
  const pending = visible.filter((r) => r.status === "pending");
  const decided = visible.filter((r) => r.status !== "pending");
  const list = show === "decided" ? decided : pending;
  const causes = (screen?.fields.find((f) => f.key === "cause")?.options as string[] | undefined) ?? [];
  const canDecide = ctx.can("input.approve");
  const waitingTotal = pending.reduce((t, r) => t + Number((r.data as ApprovalData).amount || 0), 0);

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
      </div>

      <div className="approvals-layout">
        <section>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <nav className="range-seg" aria-label="Which requests">
              <Link href="/apps/approvals" aria-current={show !== "decided"}>
                Waiting ({pending.length})
              </Link>
              <Link href="/apps/approvals?show=decided" aria-current={show === "decided"}>
                Decided ({decided.length})
              </Link>
            </nav>
            {show !== "decided" && pending.length > 0 && <span className="small muted">{fmt(waitingTotal, "money")} waiting</span>}
          </div>
          {list.length === 0 && <p className="empty-note">{show === "decided" ? "Nothing decided yet." : `Nothing waiting. Every ${v.changeOrder} has an answer.`}</p>}
          <div className="stack">
            {list.map((r) => {
              const d = r.data as ApprovalData;
              return (
                <article key={r.id} className={`card approval ${r.status}`}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div>
                      <b>{d.title}</b>
                      <div className="small muted">
                        {jobName[d.job] ?? `${v.Job} ${d.job}`} · {d.cause} · asked by {r.by_name ?? "someone"} {ago(r.created_at)}
                      </div>
                    </div>
                    <b className="tnum approval-amt">{fmt(d.amount, "money", { full: true })}</b>
                  </div>
                  <p className="small" style={{ margin: "8px 0 0" }}>
                    {d.reason}
                  </p>
                  {r.status === "pending" ? (
                    canDecide ? (
                      <ActionForm action={decideApproval} className="approval-decide">
                        <input type="hidden" name="id" value={r.id} />
                        <input name="note" className="input" placeholder="Note for the requester (optional)" maxLength={400} aria-label="Note" />
                        <Submit name="decision" value="approved" className="btn btn-primary btn-sm">
                          Approve
                        </Submit>
                        <Submit name="decision" value="rejected" className="btn btn-secondary btn-sm">
                          Reject
                        </Submit>
                      </ActionForm>
                    ) : (
                      <p className="small muted" style={{ margin: "8px 0 0" }}>
                        <Icon name="clock" /> Waiting for an owner or admin
                      </p>
                    )
                  ) : (
                    <p className="small" style={{ margin: "8px 0 0" }}>
                      <span className={`pill ${r.status === "approved" ? "good" : "risk"}`}>{r.status === "approved" ? "Approved" : "Rejected"}</span> {d.decided_by_name ? `by ${d.decided_by_name}` : ""} {ago(r.updated_at)}
                      {d.decision_note ? <span className="muted"> · “{d.decision_note}”</span> : null}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <aside className="card stack">
          <h2>
            <Icon name="send" /> Ask for an approval
          </h2>
          {ctx.can("input.submit") && jobs.length ? (
            <ApprovalRequestForm action={requestApproval} jobs={jobs} causes={causes} jobLabel={v.Job} />
          ) : (
            <p className="small muted">People who log {v.changeOrders} can ask for approvals here.</p>
          )}
          <p className="small muted" style={{ margin: 0 }}>
            Approved ones go into the {v.changeOrder} log on their own, so the budget and dashboards are right without anyone retyping them.
          </p>
        </aside>
      </div>
    </>
  );
}
