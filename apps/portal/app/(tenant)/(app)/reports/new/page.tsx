import type { Metadata } from "next";
import Link from "next/link";
import { REPORT_TEMPLATES } from "@numarket/db/demo/config";
import ActionForm, { Submit } from "@/components/ActionForm";
import { jobsInScope, workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { createReportAction } from "../../../actions";

export const metadata: Metadata = { title: "New report" };

export default async function NewReport() {
  const ctx = await requireTenant("report.edit");
  const ws = await workspace(ctx);
  const jobs = jobsInScope(ws.snapshot?.datasets, ctx);
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            <Link href="/reports">Status reports</Link>
          </p>
          <h1>New report</h1>
          <p>
            Start from a template. You can add, remove, and reorder sections on
            the next screen.
          </p>
        </div>
      </div>
      {/* children stay plain elements: this is a server page, so no render function */}
      <ActionForm action={createReportAction} className="stack">
        <>
          <fieldset
            className="template-grid"
            style={{ border: 0, padding: 0, margin: 0 }}
          >
            <legend className="sr-only">Template</legend>
            {REPORT_TEMPLATES.map((t, i) => (
              <label key={t.key} className="pick template">
                <input
                  type="radio"
                  name="template"
                  value={t.key}
                  defaultChecked={i === 0}
                />
                <span>
                  <b>{t.name}</b>
                  <small>{t.about}</small>
                  <small className="tpl-count">
                    {
                      t.layout.sections.filter((s) => s.type !== "pagebreak")
                        .length
                    }{" "}
                    sections
                  </small>
                </span>
              </label>
            ))}
          </fieldset>
          <section className="card stack">
            <div className="grid-3">
              <label className="field">
                <span className="label">Title</span>
                <input
                  name="title"
                  className="input"
                  maxLength={80}
                  required
                  placeholder="For example: Route 9 Bridge weekly update"
                />
              </label>
              <label className="field">
                <span className="label">
                  Job {ctx.scope ? "" : "(optional)"}
                </span>
                <select
                  name="job"
                  className="input"
                  defaultValue={
                    ctx.scope && jobs.length === 1 ? jobs[0].code : ""
                  }
                >
                  {!ctx.scope && <option value="">All jobs</option>}
                  {ctx.scope && <option value="">Choose…</option>}
                  {jobs.map((j) => (
                    <option key={j.code} value={j.code}>
                      {j.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="label">Prepared for (optional)</span>
                <input
                  name="prepared_for"
                  className="input"
                  maxLength={80}
                  placeholder="Your customer, if you send it to them"
                />
              </label>
            </div>
            <div>
              <Submit>Create and design it</Submit>
            </div>
          </section>
        </>
      </ActionForm>
    </>
  );
}
