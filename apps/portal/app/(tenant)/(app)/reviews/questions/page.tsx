import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { withTenant } from "@numarket/db";
import { canSeeRequest, latestAnswers, listRequests } from "@numarket/db/repo/requests";
import { listReviews } from "@numarket/db/repo/workspace";
import HubNav from "@/components/HubNav";
import Icon from "@/components/Icon";
import { ago } from "@/lib/data";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Questions for your analyst" };

/* Questions to the analyst between reviews: "why did this move?" asked from
   any chart, answered in plain words by a person who knows your numbers.
   Each one lives on the Requests board as a question, so there's one place
   to follow it; this tab shows them as a conversation, newest first. */
export default async function Questions() {
  const ctx = await requireTenant("requests.view");
  if (!ctx.tenant.products.includes("insight")) notFound();
  const who = { userId: ctx.user.id, scoped: !!ctx.scope };
  const { rows, answers, analyst } = await withTenant(
    ctx.tenant.id,
    async (db) => ({
      rows: (await listRequests(db)).filter((r) => r.kind === "question" && canSeeRequest(r, who)),
      answers: await latestAnswers(db),
      analyst: (await listReviews(db))[0]?.analyst.split(",")[0] ?? null,
    }),
    { userId: ctx.user.id },
  );
  const waiting = rows.filter((r) => r.status !== "done");
  const answered = rows.filter((r) => r.status === "done");
  const name = analyst ?? "Your analyst";

  return (
    <>
      <HubNav hub="analyst" current="/reviews/questions" ctx={ctx} />
      <div className="page-head">
        <div>
          <p className="eyebrow">Insight Review</p>
          <h1>Questions</h1>
          <p>
            Ask why a number moved, or what to do about it. {name} answers here in plain words and links the numbers behind the answer.
          </p>
        </div>
        {ctx.can("requests.submit") && (
          <Link href="/requests/new?kind=question&product=insight" className="btn btn-primary">
            <Icon name="chat" /> Ask a question
          </Link>
        )}
      </div>

      <p className="small muted q-tip">
        <Icon name="chart" /> Fastest way: press <b>Ask</b> on any chart. The question carries the chart and the view you were looking at.
      </p>

      {rows.length === 0 && <p className="empty-note">{ctx.scope ? "You haven't asked anything yet." : "No questions yet."} Ask about anything on your dashboards.</p>}

      {waiting.length > 0 && (
        <section className="q-group" aria-label="Waiting for an answer">
          <h2>
            Waiting for an answer <span className="tnum">{waiting.length}</span>
          </h2>
          <ul className="q-list">
            {waiting.map((r) => (
              <li key={r.id} className="q-item waiting">
                <Link href={`/requests/${r.id}`}>
                  <b>{r.title}</b>
                  {r.detail && <p>{r.detail}</p>}
                  <span className="small muted">
                    {r.by_name ?? "Someone"} asked {ago(r.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {answered.length > 0 && (
        <section className="q-group" aria-label="Answered">
          <h2>
            Answered <span className="tnum">{answered.length}</span>
          </h2>
          <ul className="q-list">
            {answered.map((r) => {
              const a = answers.get(r.id);
              return (
                <li key={r.id} className="q-item">
                  <Link href={`/requests/${r.id}`}>
                    <b>{r.title}</b>
                    <span className="small muted">
                      {r.by_name ?? "Someone"} asked {ago(r.created_at)}
                    </span>
                    {a && (
                      <blockquote className="q-answer">
                        <p>{a.body}</p>
                        <cite className="small">{a.author.split(" · ")[0]}, {ago(a.created_at)}</cite>
                      </blockquote>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
