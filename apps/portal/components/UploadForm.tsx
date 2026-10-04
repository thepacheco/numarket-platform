"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import type { UploadResult } from "@/lib/upload";

/* Pick a template, choose a file, check it, then import the rows that pass.
   The file is read in the browser and sent as text; the server checks it
   again on import. */
export default function UploadForm({ screens, action, maxBytes, initial }: { screens: { slug: string; title: string }[]; action: (p: UploadResult | null, f: FormData) => Promise<UploadResult>; maxBytes: number; initial?: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [screen, setScreen] = useState(initial ?? screens[0]?.slug ?? "");
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [stale, setStale] = useState(true);
  const [err, setErr] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const c = !stale ? state?.check : undefined;
  /* once imported, the file is spent: clear it so it can't go in twice */
  useEffect(() => {
    if (state?.imported) {
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }, [state]);

  return (
    <form action={formAction} className="card stack" onSubmit={() => setStale(false)}>
      <h2>Upload a file</h2>
      <div className="grid-2">
        <label className="field">
          <span className="label">Template</span>
          <select className="input" name="screen" value={screen} onChange={(e) => (setScreen(e.target.value), setStale(true))}>
            {screens.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">File (CSV, saved from Excel or Google Sheets)</span>
          <input
            ref={fileInput}
            className="input"
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              setStale(true);
              setErr("");
              const f = e.target.files?.[0];
              if (!f) return setFile(null);
              if (f.size > maxBytes) {
                setFile(null);
                return setErr(`That file is ${Math.round(f.size / 1000)} KB. Split it into files under ${Math.round(maxBytes / 1000)} KB.`);
              }
              setFile({ name: f.name, text: await f.text() });
            }}
          />
        </label>
      </div>
      <input type="hidden" name="csv" value={file?.text ?? ""} />
      {err && <p className="notice risk">{err}</p>}
      <div className="row">
        <button type="submit" name="intent" value="check" className="btn btn-primary" disabled={!file || pending}>
          {pending ? "Checking…" : "Check the file"}
        </button>
        <span className="small muted">Nothing is added until you import.</span>
      </div>

      {state && !stale && !state.check && <p className={`notice ${state.ok ? "good" : "risk"}`}>{state.message}</p>}
      {state?.ok && state.imported !== undefined && !stale && (
        <p className="small" style={{ margin: 0 }}>
          <Link href="/inputs">See your entries</Link>
        </p>
      )}

      {c && (
        <div className="stack">
          <div className="row" style={{ gap: 18 }}>
            <span>
              <strong>{file?.name}</strong>
            </span>
            <span className="pill healthy">{c.valid} ready</span>
            {c.invalid > 0 && <span className="pill reconnect">{c.invalid} need fixing</span>}
            {c.ignored.length > 0 && <span className="small muted">Ignored columns: {c.ignored.join(", ")}</span>}
          </div>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Row</th>
                  {c.columns.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                  <th>Check</th>
                </tr>
              </thead>
              <tbody>
                {c.rows.map((r) => (
                  <tr key={r.line} className={r.ok ? "" : "row-bad"}>
                    <td className="muted">{r.line}</td>
                    {r.cells.map((v, i) => (
                      <td key={i} className={v.length <= 12 ? "nowrap" : ""}>
                        {v}
                      </td>
                    ))}
                    <td>{r.ok ? <span className="pill healthy">OK</span> : <span className="small risk-text">{r.errors.join(" ")}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {c.rows.length < c.valid + c.invalid && <p className="small muted">Showing the first {c.rows.length} rows.</p>}
          <div className="row">
            <button type="submit" name="intent" value="import" className="btn btn-primary" disabled={!c.valid || pending}>
              <Icon name="upload" /> Import {c.valid} {c.valid === 1 ? "row" : "rows"}
            </button>
            {c.invalid > 0 && <span className="small muted">Rows that need fixing are skipped. Fix them in the file and upload it again.</span>}
          </div>
        </div>
      )}
    </form>
  );
}
