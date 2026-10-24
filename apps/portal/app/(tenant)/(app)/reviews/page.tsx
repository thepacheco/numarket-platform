import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { withTenant } from "@numarket/db";
import { listActionItems, listReviews } from "@numarket/db/repo/workspace";
import { fmtDateTime } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import HubNav from "@/components/HubNav";
import Icon from "@/components/Icon";

export const metadata: Metadata = { title: "Your analyst" };

/* Insight Review: what the numarket analyst found, published each month.
   Read-only here; the conversation happens in the review meeting. */
export default async function Reviews() {
  const ctx = await requireTenant("actions.view");
  if (!ctx.tenant.products.includes("insight")) notFound();
  const { reviews, actions } = await withTenant(ctx.tenant.id, async (db) => ({ reviews: await listReviews(db), actions: await listActionItems(db) }));
  const open = actions.filter((a) => a.status !== "done").length;
  const analyst = reviews[0]?.analyst.split(",")[0] ?? "Your analyst";
  const cadence = ctx.tenant.tier === "insight" ? "every month" : ctx.tenant.tier === "operate" ? "every two weeks" : "every week";
  return (
    <>
      <HubNav hub="analyst" current="/reviews" ctx={ctx} />
      <div className="page-head">
        <div>
          <p className="eyebrow">Insight Review</p>
          <h1>Your analyst</h1>
          <p>
            Your dashboards show <i>what</i> the numbers are. {analyst}, your numarket analyst, tells you <i>why</i> they moved and <i>what to do</i>, {cadence}, and keeps track until it&apos;s done.
          </p>
        </div>
      </div>
      <div className="analyst-does">
        {[
          { icon: "review", t: "The review", d: "What changed and why, what's at risk, and 3 to 5 action items with an owner and a date." },
          { icon: "users", t: "The meeting", d: "30 to 45 minutes to walk through it with your team and agree what happens next." },
          { icon: "check", t: "Action items", d: open ? `Tracked to done. ${open} still open.` : "Tracked to done. Everything is closed.", href: "/reviews/actions" },
          { icon: "report", t: "Every quarter", d: "The QBR or board pack, built from the same numbers.", href: ctx.scope ? undefined : "/reviews/qbr" },
          { icon: "pulse", t: "In between", d: "Watching your alerts and data checks, and flagging anything urgent before the next review." },
        ].map((x) => {
          const inner = (
            <>
              <span className="needs-ico tone-brand">
                <Icon name={x.icon} />
              </span>
              <b>{x.t}</b>
              <span className="small muted">{x.d}</span>
            </>
          );
          return x.href ? (
            <Link key={x.t} href={x.href} className="card analyst-step">
              {inner}
            </Link>
          ) : (
            <div key={x.t} className="card analyst-step">
              {inner}
            </div>
          );
        })}
      </div>
      <h2 className="section-h">Reviews</h2>
      <ul className="list">
        {reviews.map((r) => (
          <li key={r.id}>
            <Link href={`/reviews/${r.id}`} className="item">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h3>{r.title}</h3>
                <span className="small muted">Published {fmtDateTime(r.published_at, ctx.tenant.timezone)}</span>
              </div>
              <p className="small muted" style={{ margin: "4px 0 0" }}>
                {r.content.summary}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
