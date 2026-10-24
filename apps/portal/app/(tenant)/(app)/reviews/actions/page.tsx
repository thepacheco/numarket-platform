import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { withTenant } from "@numarket/db";
import { listActionItems, type ActionItem } from "@numarket/db/repo/workspace";
import ActionStatusControl from "@/components/ActionStatusControl";
import HubNav from "@/components/HubNav";
import Icon from "@/components/Icon";
import { fmtDateTime } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { setActionItem } from "../../../actions";

export const metadata: Metadata = { title: "Action items" };

const COLS = [
  { id: "open", label: "Open", tone: "watch", empty: "Nothing waiting to start." },
  { id: "in_progress", label: "In progress", tone: "info", empty: "Nothing in progress." },
  { id: "done", label: "Done", tone: "good", empty: "Nothing finished yet." },
] as const;

/* Every recommendation from the reviews, tracked to done. The analyst
   writes them; the people named move them along; the next review starts
   from what's still open. */
export default async function ActionItems({ searchParams }: { searchParams: Promise<{ who?: string }> }) {
  const ctx = await requireTenant("actions.view");
  if (!ctx.tenant.products.includes("insight")) notFound();
  const { who } = await searchParams;
  const all = await withTenant(ctx.tenant.id, listActionItems);
  const mineOnly = who === "me";
  const isMine = (a: ActionItem) => a.owner.trim().toLowerCase() === ctx.user.name.trim().toLowerCase();
  const items = mineOnly ? all.filter(isMine) : all;
  const canEdit = (a: ActionItem) => ctx.can("actions.manage") || (isMine(a) && ctx.can("actions.update_own"));
  const done = all.filter((a) => a.status === "done").length;
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;
  const mineCount = all.filter(isMine).length;

  return (
    <>
      <HubNav hub="analyst" current="/reviews/actions" ctx={ctx} />
      <div className="page-head">
        <div>
          <p className="eyebrow">Insight Review</p>
          <h1>Action items</h1>
          <p>What your analyst recommended in each review, who owns it, and where it stands. Move yours along as you go; your analyst starts the next review from what&apos;s still open.</p>
        </div>
      </div>

      <div className="bento" style={{ marginBottom: 18 }}>
        <div className="card c-4 stat-card">
          <span className="small muted">Done</span>
          <b className="tnum">
            {done} of {all.length}
          </b>
          <span className="quota-bar" aria-hidden="true">
            <i style={{ width: `${pct}%` }} />
          </span>
        </div>
        <div className="card c-4 stat-card">
          <span className="small muted">Still open</span>
          <b className="tnum">{all.filter((a) => a.status === "open").length}</b>
          <span className="small muted">{all.filter((a) => a.status === "in_progress").length} in progress</span>
        </div>
        <div className="card c-4 stat-card">
          <span className="small muted">Assigned to you</span>
          <b className="tnum">{mineCount}</b>
          <span className="small muted">{mineCount ? `${all.filter((a) => isMine(a) && a.status !== "done").length} not done yet` : "None this cycle"}</span>
        </div>
      </div>

      <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <nav className="range-seg" aria-label="Whose items">
          <Link href="/reviews/actions" aria-current={!mineOnly}>
            Everyone
          </Link>
          <Link href="/reviews/actions?who=me" aria-current={mineOnly}>
            Mine
          </Link>
        </nav>
        <span className="small muted">From {new Set(all.map((a) => a.reviewId)).size} reviews</span>
      </div>

      <div className="kanban">
        {COLS.map((col) => {
          const list = items.filter((a) => a.status === col.id);
          return (
            <section key={col.id} className="kanban-col" aria-label={col.label}>
              <h2>
                <span className={`pill ${col.tone}`}>{col.label}</span> <span className="muted small">{list.length}</span>
              </h2>
              {list.length === 0 && <p className="empty-note small">{col.empty}</p>}
              {list.map((a) => (
                <article key={`${a.reviewId}-${a.idx}`} className={`card action-card ${a.status}`}>
                  <b>{a.title}</b>
                  <p className="small muted">{a.detail}</p>
                  <div className="action-meta small">
                    <span>
                      <Icon name="users" /> {a.owner}
                      {isMine(a) ? " (you)" : ""}
                    </span>
                    <span>
                      <Icon name="calendar" /> Due {a.due}
                    </span>
                    <Link href={`/reviews/${a.reviewId}`}>
                      <Icon name="review" /> {a.reviewTitle}
                    </Link>
                  </div>
                  <ActionStatusControl review={a.reviewId} idx={a.idx} status={a.status} canEdit={canEdit(a)} action={setActionItem} />
                  {a.updatedAt && <span className="small muted">Updated {fmtDateTime(a.updatedAt, ctx.tenant.timezone)}</span>}
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}
