import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlockView, type BlockContext } from "@numarket/blocks/react";
import { withTenant } from "@numarket/db";
import { vocabFor } from "@numarket/db/demo/vocab";
import { listActionItems, listReviews } from "@numarket/db/repo/workspace";
import { asOfMonth } from "@/components/Dashboard";
import HubNav from "@/components/HubNav";
import Icon from "@/components/Icon";
import PrintButton from "@/components/PrintButton";
import { fmtDateTime, workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { completeQuarters, inQuarter, qbrBlocks, quarterRange, yearTo } from "@/lib/qbr";

export const metadata: Metadata = { title: "QBR pack" };

/* The quarterly business review, assembled from the same numbers as the
   dashboards and the analyst's reviews: the quarter against the one before,
   where every job stands, what was done about last quarter's action items,
   the risks, and what's next. Whole-company, so leaders only. */
export default async function QbrPack({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const ctx = await requireTenant("actions.view");
  if (!ctx.tenant.products.includes("insight") || !ctx.can("dashboard.view") || ctx.scope) notFound();
  const v = vocabFor(ctx.tenant.industry);
  const ws = await workspace(ctx);
  const { reviews, actions } = await withTenant(ctx.tenant.id, async (db) => ({ reviews: await listReviews(db), actions: await listActionItems(db) }));
  const quarters = completeQuarters(asOfMonth(ws.snapshot?.published_at, ctx.tenant.timezone));
  const { q: qParam } = await searchParams;
  const q = quarters.find((x) => x.key === qParam) ?? quarters[0];
  const datasets = ws.snapshot?.datasets ?? {};
  const updated = ws.snapshot ? fmtDateTime(ws.snapshot.published_at, ctx.tenant.timezone) : "";
  const b = qbrBlocks(v);
  const base = { datasets, scope: null, eq: {}, defs: ws.defs, updated };
  const cq: BlockContext = { ...base, range: quarterRange(q) };
  const cy: BlockContext = { ...base, range: yearTo(q) };

  const qReviews = reviews.filter((r) => inQuarter(r.period, q));
  const qActions = actions.filter((a) => inQuarter(a.period, q));
  const done = qActions.filter((a) => a.status === "done");
  const open = qActions.filter((a) => a.status !== "done");
  const risks = [...new Map(qReviews.flatMap((r) => r.content.risks).map((r) => [r.title, r])).values()].slice(0, 5);
  const analyst = qReviews[0]?.analyst ?? reviews[0]?.analyst ?? "your numarket analyst";

  return (
    <>
      <HubNav hub="analyst" current="/reviews/qbr" ctx={ctx} />
      <div className="page-head no-print">
        <div>
          <p className="eyebrow">Insight Review</p>
          <h1>QBR pack</h1>
          <p>Your quarterly business review, built from the same numbers as your dashboards. Your analyst walks you through it in the QBR meeting; print it or save it as a PDF for the board.</p>
        </div>
      </div>
      <div className="row no-print" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <nav className="range-seg" aria-label="Quarter">
          {quarters.map((x) => (
            <Link key={x.key} href={`/reviews/qbr?q=${x.key}`} aria-current={x.key === q.key}>
              {x.label}
            </Link>
          ))}
        </nav>
        <PrintButton />
      </div>

      {!ws.snapshot ? (
        <p className="notice">No data has been published yet.</p>
      ) : (
        <article className="qbr">
          <header className="qbr-cover card">
            <span className="eyebrow">Quarterly business review</span>
            <h2>
              {ctx.tenant.name} · {q.label}
            </h2>
            <p className="muted">
              Prepared by {analyst} · Numbers as of {updated}
            </p>
            <ol className="qbr-agenda">
              <li>The quarter in numbers</li>
              <li>{v.Jobs}</li>
              <li>Action items from the quarter</li>
              <li>Risks</li>
              <li>Priorities for next quarter</li>
            </ol>
          </header>

          <section className="qbr-sec">
            <h2>
              <span className="qbr-n">1</span> The quarter in numbers
            </h2>
            <div className="dash-row kpis" style={{ ["--cols" as string]: 4 }}>
              {b.kpis.map((k) => (
                <BlockView key={k.title} block={k} c={cq} />
              ))}
            </div>
            <div className="qbr-two">
              <BlockView block={b.trend} c={cy} />
              <BlockView block={b.ar} c={cq} />
            </div>
            {qReviews[0] && (
              <p className="qbr-note">
                <Icon name="review" /> <b>Analyst&apos;s read:</b> {qReviews[0].content.summary}
              </p>
            )}
          </section>

          <section className="qbr-sec">
            <h2>
              <span className="qbr-n">2</span> {v.Jobs}
            </h2>
            <BlockView block={b.jobs} c={cq} />
            <div className="qbr-two even">
              <BlockView block={b.causes} c={cq} />
              <BlockView block={b.hours} c={cy} />
            </div>
          </section>

          <section className="qbr-sec">
            <h2>
              <span className="qbr-n">3</span> Action items from the quarter
            </h2>
            {qActions.length === 0 ? (
              <p className="muted">No action items from reviews this quarter.</p>
            ) : (
              <>
                <p>
                  <b>
                    {done.length} of {qActions.length} done.
                  </b>{" "}
                  <span className="muted">
                    {open.length ? `${open.length} carried into next quarter.` : "Nothing carried over."}{" "}
                    <Link href="/reviews/actions" className="no-print">
                      Update action items
                    </Link>
                  </span>
                </p>
                <ul className="qbr-actions">
                  {qActions.map((a) => (
                    <li key={`${a.reviewId}-${a.idx}`}>
                      <span className={`pill ${a.status === "done" ? "good" : a.status === "in_progress" ? "info" : "watch"}`}>{a.status === "done" ? "Done" : a.status === "in_progress" ? "In progress" : "Open"}</span>
                      <div>
                        <b>{a.title}</b>
                        <span className="small muted">
                          {a.owner} · due {a.due} · from the {a.reviewTitle}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="qbr-sec">
            <h2>
              <span className="qbr-n">4</span> Risks
            </h2>
            {risks.length ? (
              <ul className="list">
                {risks.map((r) => (
                  <li key={r.title}>
                    <b>{r.title}.</b> <span className="muted">{r.detail}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No risks raised in this quarter&apos;s reviews.</p>
            )}
          </section>

          <section className="qbr-sec">
            <h2>
              <span className="qbr-n">5</span> Priorities for next quarter
            </h2>
            <p className="muted">Agreed in the QBR meeting. Your analyst starts from what&apos;s still open:</p>
            <ol className="qbr-priorities">
              {open.slice(0, 5).map((a) => (
                <li key={`${a.reviewId}-${a.idx}`}>
                  <b>{a.title}</b> <span className="muted">({a.owner})</span>
                </li>
              ))}
              {Array.from({ length: Math.max(0, 3 - open.length) }, (_, i) => (
                <li key={`blank-${i}`} className="qbr-blank">
                  &nbsp;
                </li>
              ))}
            </ol>
          </section>
          <p className="small muted qbr-foot">
            Every number in this pack links to a written definition in your workspace. Figures for {q.label} are compared with the quarter before; the trend charts show the 12 months to {q.label}.
          </p>
        </article>
      )}
    </>
  );
}
