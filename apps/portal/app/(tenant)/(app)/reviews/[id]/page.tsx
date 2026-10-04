import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { withTenant } from "@numarket/db";
import { getReview } from "@numarket/db/repo/workspace";
import { fmtDateTime } from "@/lib/data";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Insight Review" };

export default async function Review({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant("actions.view");
  if (!ctx.tenant.products.includes("insight")) notFound();
  const { id } = await params;
  const r = await withTenant(ctx.tenant.id, (db) => getReview(db, id));
  if (!r) notFound();
  const c = r.content;
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            <Link href="/reviews">Monthly reviews</Link>
          </p>
          <h1>{r.title}</h1>
          <p>
            Prepared by {r.analyst} · published {fmtDateTime(r.published_at, ctx.tenant.timezone)}
          </p>
        </div>
      </div>
      <article className="review">
        <div className="review-head">
          <p style={{ margin: 0, fontSize: 16 }}>{c.summary}</p>
        </div>
        <section className="review-sec">
          <h2>What changed</h2>
          <div className="changed">
            {c.changed.map((x) => (
              <div key={x.metric}>
                <span className="small muted">{x.metric}</span>
                <b className="tnum">{x.value}</b>
                <span className="small">{x.change}</span>
                <p className="small muted" style={{ margin: "6px 0 0" }}>
                  {x.note}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="review-sec">
          <h2>What&apos;s at risk</h2>
          <ul className="list">
            {c.risks.map((x) => (
              <li key={x.title}>
                <b>{x.title}.</b> <span className="muted">{x.detail}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="review-sec">
          <h2>Recommendations</h2>
          {c.recommendations.map((x) => (
            <div className="rec" key={x.title}>
              <div>
                <b>{x.title}</b>
                <div className="small muted">{x.detail}</div>
              </div>
              <div className="small" style={{ textAlign: "right" }}>
                {x.owner}
                <div className="muted">by {x.due}</div>
              </div>
            </div>
          ))}
        </section>
        <section className="review-sec">
          <h2>Usage check</h2>
          <p style={{ margin: 0 }}>
            {c.usage.rows} this month · {c.usage.allowance}. {c.usage.note}
          </p>
        </section>
        <section className="review-sec">
          <p className="small muted" style={{ margin: 0 }}>
            {c.next}
          </p>
        </section>
      </article>
    </>
  );
}
