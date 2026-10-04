import type { Metadata } from "next";
import { withTenant } from "@numarket/db";
import { listMembers } from "@numarket/db/repo/admin";
import { listFlags } from "@numarket/db/repo/workspace";
import ActionForm, { Submit } from "@/components/ActionForm";
import { ago } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { flagAction } from "../../actions";

export const metadata: Metadata = { title: "Flags" };

const SEV: Record<string, string> = { urgent: "Urgent", review: "Review", info: "FYI" };
const STATUS: Record<string, string> = { open: "Open", resolved: "Settled", correct: "Marked correct", auto_fixed: "Fixed automatically" };

/* Data problems a person needs to settle (Spec §12.2). Fixes to source data
   are made by the client in their own system; the Portal records the answer. */
export default async function Flags() {
  const ctx = await requireTenant("flags.view");
  const { flags, members } = await withTenant(
    ctx.tenant.id,
    async (db) => ({ flags: await listFlags(db), members: ctx.can("flags.resolve") ? (await listMembers(db)).filter((m) => m.status === "active") : [] }),
    { userId: ctx.user.id },
  );
  const visible = flags.filter((f) => !ctx.scope || !f.job || ctx.scope.values.includes(f.job));
  const open = visible.filter((f) => f.status === "open");
  const done = visible.filter((f) => f.status !== "open");
  const canAct = ctx.can("flags.resolve");

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Your data</p>
          <h1>Flags</h1>
          <p>Cleaning rules settle most problems on their own. These need someone who knows the business. Nothing here goes into a report until it&apos;s settled.</p>
        </div>
      </div>
      <h2 style={{ fontSize: 16, margin: "0 0 10px" }}>Open ({open.length})</h2>
      {open.length === 0 && <p className="notice good">Nothing open. Nice.</p>}
      <ul className="list">
        {open.map((f) => (
          <li key={f.id} className="item">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: "1 1 360px" }}>
                <div className="row" style={{ gap: 6, marginBottom: 4 }}>
                  <span className={`pill ${f.severity}`}>{SEV[f.severity]}</span>
                  <span className="small muted">
                    {f.source} · {ago(f.created_at)}
                    {f.assigned_name ? ` · Assigned to ${f.assigned_name}` : ""}
                  </span>
                </div>
                <h3>{f.title}</h3>
                <p className="small muted" style={{ margin: "4px 0 0" }}>
                  {f.detail}
                </p>
                {f.question && (
                  <p className="small" style={{ margin: "8px 0 0" }}>
                    <b>{f.question}</b>
                  </p>
                )}
              </div>
            </div>
            {canAct && (
              <div className="stack" style={{ marginTop: 10, gap: 10 }}>
                <ActionForm action={flagAction}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="intent" value="resolve" />
                  <div className="row">
                    {(f.options ?? ["Resolved"]).map((o, i) => (
                      <Submit key={o} className={`btn btn-sm ${i === 0 ? "btn-primary" : "btn-secondary"}`} name="option" value={o}>
                        {o}
                      </Submit>
                    ))}
                  </div>
                </ActionForm>
                <div className="row small" style={{ gap: 16 }}>
                  <ActionForm action={flagAction}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="intent" value="correct" />
                    <Submit className="btn btn-ghost btn-sm">It&apos;s correct as is</Submit>
                  </ActionForm>
                  <ActionForm action={flagAction} className="row">
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="intent" value="assign" />
                    <label className="sr-only" htmlFor={`a-${f.id}`}>Assign to</label>
                    <select id={`a-${f.id}`} name="assignee" className="input" style={{ minHeight: 32, padding: "4px 8px", width: "auto" }} defaultValue={f.assigned_to ?? ""}>
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <Submit className="btn btn-ghost btn-sm">Assign</Submit>
                  </ActionForm>
                </div>
                <details>
                  <summary className="small" style={{ cursor: "pointer", color: "var(--brand-text)", fontWeight: 600 }}>
                    Comments ({f.comments.length})
                  </summary>
                  <ul className="list" style={{ margin: "8px 0" }}>
                    {f.comments.map((c, i) => (
                      <li key={i} className="small">
                        <b>{c.by ?? "Someone"}</b>: {c.body} <span className="muted">· {ago(c.at)}</span>
                      </li>
                    ))}
                  </ul>
                  <ActionForm action={flagAction} className="row" resetOnSuccess>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="intent" value="comment" />
                    <label className="sr-only" htmlFor={`c-${f.id}`}>Comment</label>
                    <input id={`c-${f.id}`} name="body" className="input" maxLength={1000} placeholder="Add a comment" style={{ flex: "1 1 220px" }} required />
                    <Submit className="btn btn-secondary btn-sm">Comment</Submit>
                  </ActionForm>
                </details>
              </div>
            )}
          </li>
        ))}
      </ul>

      {done.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, margin: "24px 0 10px" }}>Settled ({done.length})</h2>
          <ul className="list">
            {done.map((f) => (
              <li key={f.id} className="item">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span>
                    <span className={`pill ${f.status}`}>{STATUS[f.status]}</span> <b className="small">{f.title}</b>
                  </span>
                  {canAct && f.status !== "auto_fixed" && (
                    <ActionForm action={flagAction}>
                      <input type="hidden" name="id" value={f.id} />
                      <input type="hidden" name="intent" value="reopen" />
                      <Submit className="btn btn-ghost btn-sm">Reopen</Submit>
                    </ActionForm>
                  )}
                </div>
                <p className="small muted" style={{ margin: "4px 0 0" }}>
                  {f.resolution}
                  {f.resolved_by_name ? ` · ${f.resolved_by_name}` : ""}
                  {f.resolved_at ? ` · ${ago(f.resolved_at)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
