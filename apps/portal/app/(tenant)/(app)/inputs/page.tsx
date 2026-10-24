import type { Metadata } from "next";
import Link from "next/link";
import { withTenant } from "@numarket/db";
import { vocabFor } from "@numarket/db/demo/vocab";
import { listScreens } from "@numarket/db/repo/workspace";
import Icon from "@/components/Icon";
import PendingNote from "@/components/PendingNote";
import { workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Forms" };

/* What each sample form replaces and what it feeds, so people see why it's
   here. A real workspace's forms carry the same two lines. */
const ABOUT: Record<string, { replaces: string; feeds: string; who: string }> = {
  "daily-field-report": { replaces: "The superintendent's paper daily log", feeds: "Crew hours, labor cost, and percent complete on the Jobs dashboard and the weekly status report", who: "Superintendents, from the job site" },
  "change-order-log": { replaces: "The change order spreadsheet emailed around at month end", feeds: "Change orders by cause and each job's budget", who: "Project managers" },
  "time-entry": { replaces: "The timesheet spreadsheet", feeds: "Billable hours, labor cost, and percent complete on the Projects dashboard", who: "Consultants, from any device" },
  "scope-change-log": { replaces: "Scope changes agreed by email and forgotten", feeds: "Scope changes by cause and each project's budget", who: "Project managers" },
};

export default async function Inputs() {
  const ctx = await requireTenant("input.submit");
  const v = vocabFor(ctx.tenant.industry);
  const ws = await workspace(ctx);
  const screens = await withTenant(ctx.tenant.id, listScreens);
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Forms</h1>
          <p>For information that isn&apos;t in any of your systems yet. Each form replaces one paper form or spreadsheet; what you enter goes into your data and shows up on your dashboards at the next update.</p>
        </div>
      </div>

      <ol className="how-strip">
        <li>
          <span className="how-n">1</span>
          <div>
            <b>Fill it in</b>
            <span>On a phone at the {ctx.tenant.industry === "services" ? "client site" : "job site"} or at a desk. It takes a minute.</span>
          </div>
        </li>
        <li>
          <span className="how-n">2</span>
          <div>
            <b>It&apos;s checked as you go</b>
            <span>Only your {v.jobs}, real dates, sensible numbers. Mistakes are caught before they reach the numbers.</span>
          </div>
        </li>
        <li>
          <span className="how-n">3</span>
          <div>
            <b>It shows up on dashboards</b>
            <span>At the next update, next to the data from your systems. Nobody retypes it.</span>
          </div>
        </li>
      </ol>

      <div style={{ margin: "16px 0" }}>
        <PendingNote ctx={ctx} pending={ws.pending} nextUpdate={ws.nextUpdate} />
      </div>

      <div className="bento">
        {screens.map((s) => {
          const a = ABOUT[s.slug];
          return (
            <Link key={s.slug} href={`/inputs/${s.slug}`} className="card c-6 app-card">
              <span className="app-ico form-ico">
                <Icon name="form" />
              </span>
              <h2>{s.title}</h2>
              <p className="muted">{s.description}</p>
              {a && (
                <dl className="app-facts small">
                  <dt>Replaces</dt>
                  <dd>{a.replaces}</dd>
                  <dt>Feeds</dt>
                  <dd>{a.feeds}</dd>
                  <dt>Filled in by</dt>
                  <dd>{a.who}</dd>
                </dl>
              )}
              <span className="app-foot small">
                <span className="pill">Open the form</span>
                <Icon name="arrow" />
              </span>
            </Link>
          );
        })}
      </div>
      <p className="small muted" style={{ marginTop: 16 }}>
        Got a stack of spreadsheets instead? <Link href="/upload">Upload them</Link>; every row gets the same checks.
        {ctx.tenant.products.includes("engineering") && (
          <>
            {" "}
            Paper forms can be <Link href="/apps/paper-intake">scanned in</Link>.
          </>
        )}{" "}
        Need a form for something else? Ask your numarket analyst; a new form uses your monthly change hours.
      </p>
    </>
  );
}
