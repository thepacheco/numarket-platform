import type { Metadata } from "next";
import Link from "next/link";
import { withTenant } from "@numarket/db";
import { listScreens } from "@numarket/db/repo/workspace";
import Icon from "@/components/Icon";
import UploadForm from "@/components/UploadForm";
import { jobsInScope, workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { MAX_UPLOAD_BYTES } from "@/lib/upload";
import { uploadFile } from "../../actions";

export const metadata: Metadata = { title: "Upload files" };

export default async function UploadPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const ctx = await requireTenant("input.submit");
  const { t } = await searchParams;
  const screens = await withTenant(ctx.tenant.id, listScreens);
  const ws = await workspace(ctx);
  const jobs = jobsInScope(ws.snapshot?.datasets, ctx);
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Foundation</p>
          <h1>Upload files</h1>
          <p>For data that lives in spreadsheets or another system&apos;s export. Download a template, fill it in, and upload it. Every row is checked the same way as the input screens.</p>
        </div>
      </div>
      <div className="upload-layout">
        <UploadForm screens={screens.map((s) => ({ slug: s.slug, title: s.title }))} action={uploadFile} maxBytes={MAX_UPLOAD_BYTES} initial={screens.some((s) => s.slug === t) ? t : undefined} />
        <aside className="stack">
          {screens.map((s) => (
            <section key={s.slug} className="card">
              <div className="panel-h">
                <h2>{s.title}</h2>
                <a href={`/upload/template/${s.slug}`} className="btn btn-secondary btn-sm" download>
                  <Icon name="download" /> Template
                </a>
              </div>
              <ul className="list small">
                {s.fields.map((f) => (
                  <li key={f.key}>
                    <strong>{f.label}</strong>
                    {f.required ? "" : " (optional)"}
                    <span className="muted">
                      {" · "}
                      {f.options === "jobs" ? "job code or name" : f.type === "select" ? (f.options ?? []).join(", ") : f.type === "date" ? `YYYY-MM-DD or MM/DD/YYYY${f.minDaysAgo ? `, last ${f.minDaysAgo} days` : ""}` : f.type === "number" ? `number${f.min !== undefined ? `, ${f.min.toLocaleString("en-US")} to ${f.max?.toLocaleString("en-US")}` : ""}` : `text${f.maxLength ? `, up to ${f.maxLength} characters` : ""}`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <section className="card">
            <h2>Your job codes</h2>
            <ul className="list small">
              {jobs.map((j) => (
                <li key={j.code}>
                  <strong>{j.code}</strong> <span className="muted">{j.name}</span>
                </li>
              ))}
            </ul>
          </section>
          <p className="small muted">
            Want this to happen on its own? Files in a shared Google Drive or SharePoint folder can be picked up every night. <Link href="/sources/connect">Connect a folder</Link>
          </p>
        </aside>
      </div>
    </>
  );
}
