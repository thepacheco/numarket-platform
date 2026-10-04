"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import Icon from "./Icon";
import type { ActionResult } from "./ActionForm";

/* The report designer. A report is a list of sections: text people write,
   key numbers, charts or tables from the workspace's building blocks, and
   page breaks. Everything is picked from what already exists; the server
   checks every section again before saving. */

type AnyBlock = { type: string; title: string; dataset: string; [k: string]: unknown };
type Section =
  | { kind: "commentary"; key: string; title: string; placeholder?: string }
  | { kind: "kpis"; blocks: AnyBlock[] }
  | { kind: "block"; block: AnyBlock }
  | { kind: "pagebreak" };
export type CatalogOption = { id: string; title: string; from: string; company: boolean; block: AnyBlock };
export type Design = {
  title: string;
  description: string;
  prepared_for: string;
  job: string;
  period: string;
  range: string;
  sections: Section[];
};

const KIND_LABEL = { commentary: "Text", kpis: "Key numbers", block: "Chart or table", pagebreak: "Page break" } as const;
const newKey = () => "c" + Math.random().toString(36).slice(2, 8);

export default function ReportBuilder({
  slug, initial, kpis, blocks, jobs, action, scoped,
}: {
  slug: string; initial: Design; kpis: CatalogOption[]; blocks: CatalogOption[]; jobs: { code: string; name: string }[];
  action: (prev: ActionResult | null, f: FormData) => Promise<ActionResult>; scoped: boolean;
}) {
  const [d, setD] = useState<Design>(initial);
  const [state, formAction, pending] = useActionState(action, null);
  const [addBlock, setAddBlock] = useState("");
  const set = <K extends keyof Design>(k: K, v: Design[K]) => setD((x) => ({ ...x, [k]: v }));
  const setSection = (i: number, s: Section) => setD((x) => ({ ...x, sections: x.sections.map((y, j) => (j === i ? s : y)) }));
  const move = (i: number, dir: -1 | 1) =>
    setD((x) => {
      const s = [...x.sections];
      const j = i + dir;
      if (j < 0 || j >= s.length) return x;
      [s[i], s[j]] = [s[j], s[i]];
      return { ...x, sections: s };
    });
  const remove = (i: number) => setD((x) => ({ ...x, sections: x.sections.filter((_, j) => j !== i) }));
  const add = (s: Section) => setD((x) => ({ ...x, sections: [...x.sections, s] }));
  const json = useMemo(() => JSON.stringify(d), [d]);
  /* a one-job report leaves out company-wide numbers (the server checks too) */
  const kpiOpts = d.job ? kpis.filter((k) => !k.company) : kpis;
  const blockOpts = useMemo(() => (d.job ? blocks.filter((b) => !b.company) : blocks), [d.job, blocks]);
  const isCompany = (b: AnyBlock) => [...kpis, ...blocks].some((o) => o.company && o.block.dataset === b.dataset);
  const companyCount = d.job ? d.sections.filter((s) => (s.kind === "kpis" ? s.blocks.some(isCompany) : s.kind === "block" ? isCompany(s.block) : false)).length : 0;
  const grouped = useMemo(() => {
    const m = new Map<string, CatalogOption[]>();
    for (const b of blockOpts) {
      const g = b.from.split(" · ")[0];
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(b);
    }
    return [...m.entries()];
  }, [blockOpts]);

  return (
    <form action={formAction} className="builder">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="design" value={json} />

      <section className="card stack">
        <h2>Report settings</h2>
        <div className="grid-2">
          <label className="field">
            <span className="label">Title</span>
            <input className="input" value={d.title} maxLength={80} onChange={(e) => set("title", e.target.value)} required />
          </label>
          <label className="field">
            <span className="label">Prepared for (optional)</span>
            <input className="input" value={d.prepared_for} maxLength={80} placeholder="Your customer's name, if you send it to them" onChange={(e) => set("prepared_for", e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span className="label">Description</span>
          <input className="input" value={d.description} maxLength={200} onChange={(e) => set("description", e.target.value)} />
        </label>
        <div className="grid-3">
          <label className="field">
            <span className="label">Job</span>
            <select className="input" value={d.job} onChange={(e) => set("job", e.target.value)}>
              {!scoped && <option value="">All jobs</option>}
              {jobs.map((j) => (
                <option key={j.code} value={j.code}>
                  {j.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Sent</span>
            <select className="input" value={d.period} onChange={(e) => set("period", e.target.value)}>
              <option value="week">Weekly</option>
              <option value="two weeks">Every two weeks</option>
              <option value="month">Monthly</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Numbers over time cover</span>
            <select className="input" value={d.range} onChange={(e) => set("range", e.target.value)}>
              <option value="lm">Last month</option>
              <option value="3m">Last 3 months</option>
              <option value="12m">Last 12 months</option>
              <option value="ytd">Year to date</option>
            </select>
          </label>
        </div>
      </section>

      <section className="stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Sections ({d.sections.length})</h2>
          <span className="small muted">Top to bottom, as they appear in the report and the PDF.</span>
        </div>
        {companyCount > 0 && <p className="notice risk">This report is for one job, so company-wide numbers (P&amp;L, cash, receivables) can&apos;t go in it. Remove the highlighted {companyCount === 1 ? "section" : "sections"} or set Job to All jobs.</p>}
        <ol className="sections">
          {d.sections.map((s, i) => (
            <li key={i} className={`sec sec-${s.kind}${d.job && ((s.kind === "kpis" && s.blocks.some(isCompany)) || (s.kind === "block" && isCompany(s.block))) ? " sec-warn" : ""}`}>
              <div className="sec-head">
                <span className="pill">{KIND_LABEL[s.kind]}</span>
                {s.kind === "commentary" && <input className="input sec-title" value={s.title} maxLength={60} aria-label="Section heading" onChange={(e) => setSection(i, { ...s, title: e.target.value })} />}
                {s.kind === "block" && <input className="input sec-title" value={s.block.title} maxLength={80} aria-label="Chart or table title" onChange={(e) => setSection(i, { ...s, block: { ...s.block, title: e.target.value } })} />}
                {s.kind === "kpis" && <span className="sec-sub">{s.blocks.length} of up to 4 numbers</span>}
                {s.kind === "pagebreak" && <span className="sec-sub">The PDF starts a new page here</span>}
                <span className="sec-tools">
                  <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                    <Icon name="up" />
                  </button>
                  <button type="button" className="icon-btn" onClick={() => move(i, 1)} disabled={i === d.sections.length - 1} aria-label="Move down">
                    <Icon name="down" />
                  </button>
                  <button type="button" className="icon-btn" onClick={() => remove(i)} aria-label="Remove section">
                    <Icon name="trash" />
                  </button>
                </span>
              </div>
              {s.kind === "commentary" && <p className="small muted" style={{ margin: "6px 0 0" }}>Written by your team in the report each time. {s.placeholder ? `Prompt: “${s.placeholder}”` : ""}</p>}
              {s.kind === "block" && <p className="small muted" style={{ margin: "6px 0 0" }}>From {blocks.find((b) => b.block.dataset === s.block.dataset && b.block.type === s.block.type)?.from ?? "your workspace"} · {s.block.type === "table" || s.block.type === "statement" ? "table" : "chart"}</p>}
              {s.kind === "kpis" && (
                <div className="kpi-picks">
                  {s.blocks.map((b, j) => (
                    <span key={j} className="chip">
                      {b.title}
                      <button type="button" aria-label={`Remove ${b.title}`} onClick={() => setSection(i, { ...s, blocks: s.blocks.filter((_, x) => x !== j) })}>
                        ×
                      </button>
                    </span>
                  ))}
                  {s.blocks.length < 4 && (
                    <select
                      className="input"
                      value=""
                      aria-label="Add a number"
                      onChange={(e) => {
                        const k = kpiOpts.find((x) => x.id === e.target.value);
                        if (k) setSection(i, { ...s, blocks: [...s.blocks, k.block] });
                      }}
                    >
                      <option value="">Add a number…</option>
                      {kpiOpts.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.title} ({k.from})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
        <div className="add-bar">
          <span className="small muted">Add:</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => add({ kind: "commentary", key: newKey(), title: "New section", placeholder: "" })}>
            <Icon name="plus" /> Text
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => add({ kind: "kpis", blocks: [] })}>
            <Icon name="plus" /> Key numbers
          </button>
          <select className="input" value={addBlock} onChange={(e) => setAddBlock(e.target.value)} aria-label="Chart or table to add" style={{ width: "auto", minHeight: 32 }}>
            <option value="">Chart or table…</option>
            {grouped.map(([g, list]) => (
              <optgroup key={g} label={g}>
                {list.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({b.from.split(" · ")[1]})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!addBlock}
            onClick={() => {
              const b = blockOpts.find((x) => x.id === addBlock);
              if (b) add({ kind: "block", block: b.block });
              setAddBlock("");
            }}
          >
            <Icon name="plus" /> Add it
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => add({ kind: "pagebreak" })}>
            <Icon name="plus" /> Page break
          </button>
        </div>
      </section>

      <div className="row builder-save">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save report design"}
        </button>
        <Link href={`/reports/${slug}`} className="btn btn-secondary">
          View report
        </Link>
        {state && <span className={`notice ${state.ok ? "good" : "risk"}`}>{state.message}</span>}
      </div>
    </form>
  );
}
