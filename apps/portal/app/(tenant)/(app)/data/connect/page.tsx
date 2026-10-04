import type { Metadata } from "next";
import Link from "next/link";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Use your data in your own tools" };

/* For clients whose analysts want to work in their own tools. */
export default async function ConnectTools() {
  const ctx = await requireTenant("sources.view");
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            <Link href="/data">Data tables</Link>
          </p>
          <h1>Use your data in your own tools</h1>
          <p>Your analysts can read the same clean tables from Excel, Power BI, Tableau, or any tool that connects to Snowflake, with a read-only login that can&apos;t change anything.</p>
        </div>
      </div>
      <div className="grid-2" style={{ alignItems: "start" }}>
        <section className="card stack">
          <h2>How it works</h2>
          <ol className="steps">
            <li>
              <b>An Owner asks for access here.</b> Your numarket analyst sets up a read-only login for the people you name.
            </li>
            <li>
              <b>They sign in from their tool</b> using your company&apos;s single sign-on, with the second sign-in step on.
            </li>
            <li>
              <b>They see the clean tables only</b>: the same ones listed under Data tables, with the same definitions. Not the raw copies, not the cleaning code.
            </li>
            <li>
              <b>Their queries run on their own allowance</b>, so heavy analysis doesn&apos;t slow your dashboards or use your plan&apos;s included usage.
            </li>
          </ol>
        </section>
        <section className="card stack">
          <h2>Getting access</h2>
          <p style={{ margin: 0 }}>Your analyst sets up the logins and tells you about any added cost before anything is turned on.</p>
          <button className="btn btn-primary" disabled aria-disabled="true" style={{ justifySelf: "start" }}>
            Ask for access
          </button>
          <p className="small muted" style={{ margin: 0 }}>
            {ctx.tenant.isDemo ? "The demo doesn't create logins." : "Requests go to your numarket analyst."} Every login and query is recorded in your audit log.
          </p>
        </section>
      </div>
    </>
  );
}
