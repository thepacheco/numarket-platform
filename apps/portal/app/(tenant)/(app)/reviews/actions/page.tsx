import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { withTenant } from "@numarket/db";
import { listMembers } from "@numarket/db/repo/admin";
import { listActionItems, type ActionItem } from "@numarket/db/repo/workspace";
import ActionForm, { Submit } from "@/components/ActionForm";
import ActionStatusControl from "@/components/ActionStatusControl";
import HubNav from "@/components/HubNav";
import Icon from "@/components/Icon";
import { daysFromToday, dueDate, fmtDateTime } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { remindActionItem, setActionItem } from "../../../actions";

export const metadata: Metadata = { title: "Action items" };

type Row = ActionItem & { days: number | null };
const GROUPS = [
  { id: "late", label: "Overdue" },
  { id: "week", label: "Due this week" },
  { id: "later", label: "Later" },
] as const;

function dueText(r: Row) {
  if (r.days === null) return `Due ${r.due}`;
  if (r.status === "done") return `Was due ${r.due}`;
  if (r.days < 0) return `Due ${r.due} · ${-r.days} ${r.days === -1 ? "day" : "days"} late`;
  if (r.days === 0) return "Due today";
  return `Due ${r.due} · in ${r.days} ${r.days === 1 ? "day" : "days"}`;
}

/* The decisions from each review, tracked to done. The analyst writes them
   with one owner each; owners move them along (or get a reminder); the next
   review starts from what's still open. Not a task manager: only what a
   review recommended. */
export default async function ActionItems({ searchParams }: { searchParams: Promise<{ who?: string }> }) {
  const ctx = await requireTenant("actions.view");
  if (!ctx.tenant.products.includes("insight")) notFound();
  const { who } = await searchParams;
  const tz = ctx.tenant.timezone;
  const { all, people } = await withTenant(
    ctx.tenant.id,
    async (db) => ({
      all: await listActionItems(db),
      /* who has a sign-in, so a reminder can reach them */
      people: ctx.can("actions.manage") ? new Set((await listMembers(db)).filter((m) => m.status === "active").map((m) => m.name.trim().toLowerCase())) : new Set<string>(),
    }),
    { userId: ctx.user.id },
  );
  const isMine = (a: ActionItem) => a.owner.trim().toLowerCase() === ctx.user.name.trim().toLowerCase();
  const canEdit = (a: ActionItem) => ctx.can("actions.manage") || (isMine(a) && ctx.can("actions.update_own"));
  const rows: Row[] = all.map((a) => {
    const d = dueDate(a.due, a.period);
    return { ...a, days: d ? daysFromToday(d, tz) : null };
  });
  const mineOnly = who === "me";
  const shown = mineOnly ? rows.filter(isMine) : rows;
  const open = shown.filter((r) => r.status !== "done");
  const group = (r: Row) => (r.days === null ? "later" : r.days < 0 ? "late" : r.days <= 7 ? "week" : "later");
  const done = shown.filter((r) => r.status === "done");
  const late = open.filter((r) => group(r) === "late").length;

  const Item = ({ r }: { r: Row }) => (
    <li className={`ai-row ${r.status} ${r.status !== "done" && group(r) === "late" ? "late" : ""}`}>
      <div className="ai-main">
        <b>{r.title}</b>
        {r.detail && <p>{r.detail}</p>}
        <div className="ai-meta small">
          <span className="ai-owner">
            <span className="ai-av" aria-hidden="true">
              {r.owner
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")}
            </span>
            {r.owner}
            {isMine(r) ? " (you)" : ""}
          </span>
          <span className="ai-due">
            <Icon name="calendar" /> {dueText(r)}
          </span>
          <Link href={`/reviews/${r.reviewId}`}>
            <Icon name="review" /> {r.reviewTitle}
          </Link>
          {r.source && (
            <Link href={r.source.link} className="ai-source" data-tip="The number this came from">
              <Icon name="chart" /> {r.source.label}
            </Link>
          )}
        </div>
        {r.doneWhen && (
          <p className="ai-when small">
            <b>Done when:</b> {r.doneWhen}
          </p>
        )}
      </div>
      <div className="ai-side">
        <ActionStatusControl review={r.reviewId} idx={r.idx} status={r.status} canEdit={canEdit(r)} action={setActionItem} />
        {r.status !== "done" && ctx.can("actions.manage") && people.has(r.owner.trim().toLowerCase()) && !isMine(r) && (
          <ActionForm action={remindActionItem} className="ai-remind">
            <input type="hidden" name="review" value={r.reviewId} />
            <input type="hidden" name="idx" value={r.idx} />
            <Submit className="btn btn-ghost btn-sm">
              <Icon name="bell" /> Remind {r.owner.split(" ")[0]}
            </Submit>
          </ActionForm>
        )}
        {r.updatedAt && <span className="small muted">Updated {fmtDateTime(r.updatedAt, tz)}</span>}
      </div>
    </li>
  );

  return (
    <>
      <HubNav hub="analyst" current="/reviews/actions" ctx={ctx} />
      <div className="page-head">
        <div>
          <p className="eyebrow">Insight Review</p>
          <h1>Action items</h1>
          <p>The decisions from each review. Every one has one owner, a due date, what done looks like, and the number it came from.</p>
        </div>
      </div>

      <ol className="ai-how" aria-label="How action items work">
        <li>
          <b>1</b> Your analyst writes them in the review and names an owner.
        </li>
        <li>
          <b>2</b> The owner moves it along here. An admin can send a reminder to their bell and email.
        </li>
        <li>
          <b>3</b> The next review checks whether the number moved.
        </li>
      </ol>

      <div className="row ai-bar">
        <nav className="range-seg" aria-label="Whose items">
          <Link href="/reviews/actions" aria-current={!mineOnly}>
            Everyone
          </Link>
          <Link href="/reviews/actions?who=me" aria-current={mineOnly}>
            Mine
          </Link>
        </nav>
        <span className="small muted">
          {open.length} open{late ? `, ${late} overdue` : ""} · {done.length} done
        </span>
      </div>

      {open.length === 0 && <p className="empty-note">{mineOnly ? "Nothing open with your name on it." : "Everything from the reviews is done."}</p>}
      {GROUPS.map((g) => {
        const list = open.filter((r) => group(r) === g.id).sort((a, b) => (a.days ?? 99) - (b.days ?? 99));
        if (!list.length) return null;
        return (
          <section key={g.id} className={`ai-group g-${g.id}`} aria-label={g.label}>
            <h2>
              {g.label} <span className="tnum">{list.length}</span>
            </h2>
            <ul>
              {list.map((r) => (
                <Item key={`${r.reviewId}-${r.idx}`} r={r} />
              ))}
            </ul>
          </section>
        );
      })}
      {done.length > 0 && (
        <details className="ai-group g-done">
          <summary>
            Done <span className="tnum">{done.length}</span>
          </summary>
          <ul>
            {done.map((r) => (
              <Item key={`${r.reviewId}-${r.idx}`} r={r} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
