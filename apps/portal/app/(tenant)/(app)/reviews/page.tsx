import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { withTenant } from "@numarket/db";
import { listReviews } from "@numarket/db/repo/workspace";
import { fmtDateTime } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import HubNav from "@/components/HubNav";

export const metadata: Metadata = { title: "Monthly reviews" };

/* Insight Review: what the numarket analyst found, published each month.
   Read-only here; the conversation happens in the review meeting. */
export default async function Reviews() {
  const ctx = await requireTenant("actions.view");
  if (!ctx.tenant.products.includes("insight")) notFound();
  const reviews = await withTenant(ctx.tenant.id, listReviews);
  return (
    <>
      <HubNav hub="analyst" current="/reviews" ctx={ctx} />
      <div className="page-head">
        <div>
          <p className="eyebrow">Insight Review</p>
          <h1>Monthly reviews</h1>
          <p>Your numarket analyst reviews your numbers each month: what changed, what&apos;s at risk, and what to do next. You go through it together in the review meeting.</p>
        </div>
      </div>
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
