import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fmt } from "@numarket/blocks";
import { withTenant } from "@numarket/db";
import { canSeeRequest, getRequest, KIND_LABEL, REQUEST_STATUSES, requestUpdates, STATUS_LABEL } from "@numarket/db/repo/requests";
import { listReviews } from "@numarket/db/repo/workspace";
import { TIER_LIMITS } from "@numarket/metering";
import ActionForm, { Submit } from "@/components/ActionForm";
import SketchPreview from "@/components/SketchPreview";
import SolidIcon from "@/components/solids/SolidIcon";
import { ago, fmtDateTime } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { PRODUCT_INFO } from "@/lib/nav";
import { requestUpdateAction } from "../../../actions";

export const metadata: Metadata = { title: "Request" };

/* "/dashboards/financials?page=overview" reads as "Financials dashboard" */
function linkLabel(link: string) {
  const parts = link.split("?")[0].replace(/^\//, "").split("/");
  const name = (parts[1] ?? parts[0]).replace(/-/g, " ");
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  return parts[0] === "dashboards" && parts[1] ? `${cap} dashboard` : parts[0] === "explore" && parts[1] ? `${cap} in Explore` : parts.join(" › ").replace(/-/g, " ");
}

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant("requests.view");
  const { id } = await params;
  const data = await withTenant(ctx.tenant.id, async (db) => {
    const r = await getRequest(db, id);
    if (!r || !canSeeRequest(r, { userId: ctx.user.id, scoped: !!ctx.scope })) return null;
    /* a question goes straight to the analyst who writes the reviews */
    const analyst = r.kind === "question" ? ((await listReviews(db))[0]?.analyst.split(",")[0] ?? null) : null;
    return { r, updates: await requestUpdates(db, id), analyst };
  }, { userId: ctx.user.id });
  if (!data) notFound();
  const { r, updates, analyst } = data;
  const question = r.kind === "question";
  const tz = ctx.tenant.timezone;
  /* a question is asked, then answered; everything else moves through the board's columns */
  const steps = r.kind === "question" ? (["submitted", "done"] as const) : REQUEST_STATUSES;
  const step = r.kind === "question" ? (r.status === "done" ? 1 : 0) : REQUEST_STATUSES.indexOf(r.status);
  const canSignOff = r.status === "review" && ctx.can("requests.submit") && (r.requested_by === ctx.user.id || ctx.can("requests.approve"));
  const canComment = ctx.can("requests.submit") && r.status !== "done";

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            {question ? <Link href="/reviews/questions">Questions</Link> : <Link href="/requests">Requests</Link>} · {KIND_LABEL[r.kind]}
          </p>
          <h1>{r.title}</h1>
          <p className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <span className={`req-prod-chip p-${r.product}`}>
              <SolidIcon kind={r.product} size={14} /> {PRODUCT_INFO[r.product].name}
            </span>
            {r.priority === "high" && r.status !== "done" && <span className="pill risk">Urgent</span>}
            <span className="small muted">
              Asked by {r.by_name ?? "someone"} · {fmtDateTime(r.created_at, tz)}
            </span>
          </p>
        </div>
      </div>

      <ol className="req-steps" style={{ ["--n" as string]: steps.length }} aria-label="Where it stands">
        {steps.map((st, i) => (
          <li key={st} className={i < step ? "done" : i === step ? "now" : ""} aria-current={i === step ? "step" : undefined}>
            <span>{i < step ? "✓" : i + 1}</span>
            {r.kind === "question" ? (st === "done" ? "Answered" : "Asked") : STATUS_LABEL[st]}
          </li>
        ))}
      </ol>

      <div className="req-detail">
        <section className="card">
          <h2>What was asked</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{r.detail || r.title}</p>
          {r.sketch && r.sketch.length > 0 && <SketchPreview blocks={r.sketch} title={r.title} />}
          <h2 style={{ marginTop: 22 }}>
            Updates
          </h2>
          <ol className="req-timeline">
            {updates.map((u) => (
              <li key={u.id} className={u.user_id ? "client" : "numarket"}>
                <div className="req-who">
                  <b>{u.author}</b>
                  <span className="small muted" title={fmtDateTime(u.created_at, tz)}>
                    {ago(u.created_at)}
                  </span>
                  {u.status && <span className={`pill st-${u.status}`}>{STATUS_LABEL[u.status]}</span>}
                </div>
                <p>{u.body}</p>
              </li>
            ))}
          </ol>

          {canSignOff && (
            <ActionForm action={requestUpdateAction} className="req-signoff">
              <input type="hidden" name="id" value={r.id} />
              <b>Is it right?</b>
              <p className="small muted" style={{ margin: 0 }}>
                {r.link ? (
                  <>
                    Have a look at <Link href={r.link}>the result</Link> first.{" "}
                  </>
                ) : null}
                Approve it to close the request, or send it back with what should change.
              </p>
              <label className="field">
                <span className="label">Note (needed to send it back)</span>
                <textarea name="body" className="input" rows={2} maxLength={4000} />
              </label>
              <div className="row" style={{ gap: 8 }}>
                <Submit name="intent" value="approve">
                  Approve
                </Submit>
                <Submit name="intent" value="send_back" className="btn btn-secondary">
                  Send it back
                </Submit>
              </div>
            </ActionForm>
          )}
          {canComment && !canSignOff && (
            <ActionForm action={requestUpdateAction} className="req-comment" resetOnSuccess>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="intent" value="comment" />
              <label className="field">
                <span className="label">Add a comment</span>
                <textarea name="body" className="input" rows={3} maxLength={4000} placeholder="A question, more detail, or a screenshot link" />
              </label>
              <Submit>Comment</Submit>
            </ActionForm>
          )}
        </section>

        <aside className="card req-facts">
          <dl>
            <div>
              <dt>Status</dt>
              <dd>{question ? (r.status === "done" ? "Answered" : "Waiting for an answer") : STATUS_LABEL[r.status]}</dd>
            </div>
            <div>
              <dt>With</dt>
              <dd>{r.assignee ?? (question ? (analyst ?? "Your analyst") : "Your analyst, once it's planned")}</dd>
            </div>
            {r.estimate_hours && (
              <div>
                <dt>Estimate</dt>
                <dd className="tnum">
                  ~{Number(r.estimate_hours)} change {Number(r.estimate_hours) === 1 ? "hour" : "hours"}
                </dd>
              </div>
            )}
            {r.quote_amount && (
              <div>
                <dt>Quote</dt>
                <dd className="tnum">{fmt(Number(r.quote_amount), "money", { full: true })}, fixed</dd>
              </div>
            )}
            {r.link && (
              <div>
                <dt>Asked from</dt>
                <dd>
                  <Link href={r.link}>{linkLabel(r.link)}</Link>
                </dd>
              </div>
            )}
            <div>
              <dt>Reply time</dt>
              <dd>{TIER_LIMITS[ctx.tenant.tier].replyTime}</dd>
            </div>
            <div>
              <dt>Last update</dt>
              <dd>{fmtDateTime(r.updated_at, tz)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </>
  );
}
