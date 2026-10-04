import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { withTenant } from "@numarket/db";
import { snapshotVersion } from "@numarket/db/repo/snapshots";
import { getReport, reportVersions } from "@numarket/db/repo/workspace";
import ActionForm, { Submit } from "@/components/ActionForm";
import Icon from "@/components/Icon";
import ReportDocument from "@/components/ReportDocument";
import { ago, fmtDateTime, reportVisible, workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { saveReport } from "../../../actions";

export const metadata: Metadata = { title: "Report" };

export default async function ReportPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ v?: string; view?: string }> }) {
  const ctx = await requireTenant("report.view");
  const { slug } = await params;
  const sp = await searchParams;
  const ws = await workspace(ctx);
  const tz = ctx.tenant.timezone;
  const { report, versions } = await withTenant(ctx.tenant.id, async (db) => ({ report: await getReport(db, slug), versions: await reportVersions(db, slug) }), { userId: ctx.user.id });
  if (!report || !reportVisible(report.layout, ctx)) notFound();

  const wantDraft = sp.view === "draft" || versions.length === 0;
  const chosen = !wantDraft ? versions.find((v) => String(v.version) === sp.v) ?? versions[0] : null;
  const snap = chosen ? await withTenant(ctx.tenant.id, (db) => snapshotVersion(db, chosen.snapshot_version)) : ws.snapshot;
  const commentary = chosen ? chosen.commentary : report.draft;
  const b = ws.branding;
  const meta = chosen
    ? `Version ${chosen.version} · published ${fmtDateTime(chosen.published_at, tz)}${chosen.by_name ? ` by ${chosen.by_name}` : ""}`
    : `Draft preview · data as of ${ws.snapshot ? fmtDateTime(ws.snapshot.published_at, tz) : "—"}`;
  const sections = report.layout.sections.flatMap((s) => (s.type === "commentary" ? [s] : []));

  return (
    <>
      <div className="page-head no-print">
        <div>
          <p className="eyebrow">
            <Link href="/reports">Status reports</Link>
          </p>
          <h1>{report.title}</h1>
          <p>{report.description}</p>
        </div>
        <div className="row">
          {ctx.can("report.edit") && (
            <Link className="btn btn-secondary" href={`/reports/${slug}/design`}>
              Design
            </Link>
          )}
          {versions.length > 0 && (
            <Link className="btn btn-secondary" href={wantDraft ? `/reports/${slug}` : `/reports/${slug}?view=draft`}>
              {wantDraft ? "See the published version" : "See the draft"}
            </Link>
          )}
          <a className="btn btn-primary" href={`/reports/${slug}/pdf${chosen ? `?v=${chosen.version}` : ""}`}>
            <Icon name="pdf" /> Download PDF
          </a>
        </div>
      </div>

      <div className={`report-layout ${ctx.can("report.edit") ? "" : "solo"}`}>
        <div>
          {snap ? (
            <ReportDocument
              layout={report.layout}
              commentary={commentary}
              datasets={snap.datasets}
              publishedAt={snap.published_at}
              ctx={ctx}
              defs={ws.defs}
              brand={{ name: b?.display_name ?? ctx.tenant.name, logo: b?.logo_text ?? "", footer: b?.report_footer ?? null }}
              title={report.title}
              meta={meta}
            />
          ) : (
            <p className="notice">No data has been published yet.</p>
          )}
        </div>

        <aside className="stack no-print">
          {ctx.can("report.edit") && (
            <section className="card">
              <h2>Commentary</h2>
              <p className="small muted" style={{ marginTop: -4 }}>
                {report.draft_updated_at ? `Draft saved ${ago(report.draft_updated_at)}${report.draft_by ? ` by ${report.draft_by}` : ""}.` : "Write what the numbers don't say."}
              </p>
              <ActionForm action={saveReport} className="stack">
                <input type="hidden" name="slug" value={slug} />
                {sections.map((s) => (
                  <div className="field" key={s.key}>
                    <label htmlFor={`c-${s.key}`}>{s.title}</label>
                    <textarea id={`c-${s.key}`} name={`c_${s.key}`} className="input" defaultValue={report.draft[s.key] ?? ""} placeholder={s.placeholder} maxLength={4000} />
                  </div>
                ))}
                <div className="row">
                  <Submit className="btn btn-secondary" name="intent" value="draft">
                    Save draft
                  </Submit>
                  {ctx.can("report.publish") ? (
                    <Submit className="btn btn-primary" name="intent" value="publish">
                      Publish
                    </Submit>
                  ) : (
                    <span className="small muted">Someone with publish rights will publish it.</span>
                  )}
                </div>
              </ActionForm>
            </section>
          )}
          <section className="card">
            <h2>Versions</h2>
            {versions.length ? (
              <ul className="list">
                {versions.map((v) => (
                  <li key={v.version} className="small row" style={{ justifyContent: "space-between" }}>
                    <Link href={`/reports/${slug}?v=${v.version}`}>Version {v.version}</Link>
                    <span className="muted">
                      {fmtDateTime(v.published_at, tz)}
                      {v.by_name ? ` · ${v.by_name}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small muted">Not published yet. Publishing freezes the numbers and the commentary as a version you can send.</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
