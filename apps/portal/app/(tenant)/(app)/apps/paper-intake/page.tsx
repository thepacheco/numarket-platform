import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { fmt } from "@numarket/blocks";
import { withTenant } from "@numarket/db";
import { packFor } from "@numarket/db/demo/packs";
import { getScreen } from "@numarket/db/repo/workspace";
import EntryForm from "@/components/EntryForm";
import ScanDemo from "@/components/ScanDemo";
import { appsFor } from "@/lib/apps";
import { jobsInScope, todayIn, workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { submitEntry } from "../../../actions";

export const metadata: Metadata = { title: "Scan a paper form" };

/* Example Engineering app: a paper form, photographed, read into the same
   entry the input form makes. */
export default async function PaperIntake() {
  const ctx = await requireTenant("definitions.view");
  if (!ctx.tenant.products.includes("engineering")) redirect("/available/engineering");
  const pack = packFor(ctx.tenant.industry);
  const v = pack.vocab;
  const app = appsFor(ctx.tenant.industry, v).find((a) => a.slug === "paper-intake")!;
  const ws = await workspace(ctx);
  const screen = await withTenant(ctx.tenant.id, (db) => getScreen(db, pack.screenSlugs.field));
  if (!screen) notFound();
  const jobs = jobsInScope(ws.snapshot?.datasets, ctx);
  const today = todayIn(ctx.tenant.timezone);
  const yesterday = new Date(new Date(`${today}T12:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
  const services = ctx.tenant.industry === "services";
  /* the sample form is for a job this person can see */
  const job = jobs.find((j) => j.code === (services ? "204" : "114")) ?? jobs[0];
  const sample = services
    ? { crew_hours: "7.5", pct_complete: "47", note: "Loan flow screens with compliance. Started the SSO estimate." }
    : { crew_hours: "64", pct_complete: "49", note: "Poured pier 3 cap. Waiting on RFI 212 for deck drains. 8 on crew." };
  const lines = [
    { label: v.Job, value: job ? `${job.name} (${job.code})` : "—", sure: true },
    { label: "Date", value: fmt(yesterday, "date"), sure: true },
    { label: v.Hours, value: sample.crew_hours, sure: true },
    { label: "Percent complete", value: `${sample.pct_complete}%`, sure: false },
    { label: "Note", value: sample.note, sure: true },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            <Link href="/apps">Apps</Link>
          </p>
          <h1>{app.name}</h1>
          <p>{app.what}</p>
        </div>
      </div>
      {!job ? (
        <p className="notice">There are no {v.jobs} in your view to try this with.</p>
      ) : (
        <ScanDemo title={services ? "Weekly timesheet" : "Daily log"} lines={lines}>
          {ctx.can("input.submit") ? (
            <EntryForm action={submitEntry} screen={screen.slug} fields={screen.fields} jobs={jobs} today={today} defaults={{ job: job.code, date: yesterday, ...sample }} via="scan" submitLabel={`Save as a ${v.fieldReport}`} />
          ) : (
            <p className="notice">Your role can look but not save entries. People who fill in {v.fieldReports} can save this.</p>
          )}
        </ScanDemo>
      )}
      <section className="card" style={{ marginTop: 18 }}>
        <h2>How it works in your workspace</h2>
        <ol className="steps-list">
          <li>
            <b>Built around your form.</b> Engineering sets it up for the exact paper form your team already uses, so nobody has to change how they fill it in.
          </li>
          <li>
            <b>A person checks every read.</b> Nothing is saved until someone confirms the fields; unclear handwriting is marked for a second look.
          </li>
          <li>
            <b>Same data, same checks.</b> A scanned form becomes the same {v.fieldReport} entry as the{" "}
            {ctx.can("input.submit") ? <Link href={`/inputs/${screen.slug}`}>form</Link> : "form"}, and it shows up on your dashboards at the next update.
          </li>
        </ol>
      </section>
    </>
  );
}
