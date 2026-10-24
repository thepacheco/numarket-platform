import type { Metadata } from "next";
import { withTenant } from "@numarket/db";
import { vocabFor } from "@numarket/db/demo/vocab";
import { TIER_LIMITS } from "@numarket/metering";
import AskBox from "@/components/AskBox";
import { suggestedFor } from "@/lib/ask";
import { recentQuestions } from "@/lib/askHistory";
import { ago, fmtDateTime, workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { askQuestion } from "../../actions";

export const metadata: Metadata = { title: "Ask Your Data" };

export default async function AskPage() {
  const ctx = await requireTenant("ask.use");
  const v = vocabFor(ctx.tenant.industry);
  const ws = await workspace(ctx);
  const defs = Object.fromEntries(Object.values(ws.defs).map((d) => [d.name, d.means]));
  const quota = TIER_LIMITS[ctx.tenant.tier].askQuestionsPerMonth;
  const { used, history } = await withTenant(
    ctx.tenant.id,
    async (db) => ({
      used: (await db.query<{ n: number }>("select count(*)::int as n from audit_log where action = 'ask.question' and at >= date_trunc('month', now())")).rows[0].n,
      history: (await recentQuestions(db, ctx)).map((h) => ({ q: h.q, when: ago(h.at), answered: h.answered })),
    }),
    { userId: ctx.user.id },
  );
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Ask Your Data</h1>
          <p>
            Ask in plain English. Answers come from your published numbers and the same definitions as your dashboards, within what you&apos;re allowed to see.
            {ws.snapshot && <span className="muted"> Data updated {fmtDateTime(ws.snapshot.published_at, ctx.tenant.timezone)}.</span>}
          </p>
        </div>
        <div className="quota" data-tip="Questions run on small summary tables in your private database, with a monthly allowance so the cost stays predictable.">
          <span className="small muted">Questions this month</span>
          <b className="tnum">
            {used.toLocaleString("en-US")}
            {quota !== null && !ctx.tenant.isDemo ? <span className="muted"> / {quota.toLocaleString("en-US")}</span> : null}
          </b>
          {quota !== null && !ctx.tenant.isDemo && (
            <span className="quota-bar" aria-hidden="true">
              <i style={{ width: `${Math.min(100, (used / quota) * 100)}%` }} />
            </span>
          )}
        </div>
      </div>
      {ctx.scope && <p className="notice">Your access covers your {v.jobs} only, so company-wide questions (cash, revenue, who owes what) aren&apos;t answered for you.</p>}
      <AskBox action={askQuestion} suggested={suggestedFor(v, !!ctx.scope)} defs={defs} history={history} />
      <p className="small muted" style={{ marginTop: 18, maxWidth: "72ch" }}>
        {ctx.tenant.isDemo
          ? "In this demo, Ask Your Data answers the common question types shown above. In your workspace it runs on AI inside your own private database, reads only your governed summary tables and definitions, and shows how each answer was worked out."
          : "Answers run inside your private database on summary tables, using your definitions. Check anything important against the dashboard it came from."}{" "}
        Each plan includes a monthly allowance of questions ({TIER_LIMITS.insight.askQuestionsPerMonth} on Small, {TIER_LIMITS.operate.askQuestionsPerMonth?.toLocaleString("en-US")} on Mid), so the cost is fixed.
      </p>
    </>
  );
}
