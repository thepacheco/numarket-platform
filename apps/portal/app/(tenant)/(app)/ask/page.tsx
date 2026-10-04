import type { Metadata } from "next";
import AskBox from "@/components/AskBox";
import { SUGGESTED } from "@/lib/ask";
import { fmtDateTime, workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { askQuestion } from "../../actions";

export const metadata: Metadata = { title: "Ask Your Data" };

export default async function AskPage() {
  const ctx = await requireTenant("ask.use");
  const ws = await workspace(ctx);
  const defs = Object.fromEntries(Object.values(ws.defs).map((d) => [d.name, d.means]));
  const suggested = ctx.scope ? SUGGESTED.filter((s) => !/owes|cash|net income/i.test(s)) : SUGGESTED;
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
      </div>
      {ctx.scope && <p className="notice">Your access covers your jobs only, so company-wide questions (cash, revenue, who owes what) aren&apos;t answered for you.</p>}
      <AskBox action={askQuestion} suggested={suggested} defs={defs} />
      <p className="small muted" style={{ marginTop: 18 }}>
        {ctx.tenant.isDemo
          ? "In this demo, Ask Your Data answers the common question types shown above. In your workspace it runs on AI inside your own private database, reads only your governed tables and definitions, and shows how each answer was worked out."
          : "Answers run inside your private database and use only your governed tables and definitions. Check anything important against the dashboard it came from."}
      </p>
    </>
  );
}
