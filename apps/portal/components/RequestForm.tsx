"use client";

import { useState } from "react";
import type { RequestKind, RequestProduct, SketchBlock } from "@numarket/db/repo/requests";
import ActionForm, { Submit, type ActionResult } from "./ActionForm";
import SketchPreview, { SKETCH_INFO } from "./SketchPreview";
import SolidIcon from "./solids/SolidIcon";

const KINDS: { id: RequestKind; name: string; line: string; product: RequestProduct; placeholder: string }[] = [
  { id: "change", name: "Dashboard or report change", line: "A new page, chart, or number. Uses change hours.", product: "workspace", placeholder: "What do you want to see, and who's it for? For example: a page for the warehouse team showing late shipments by carrier." },
  { id: "app", name: "New app idea", line: "Something built for you. We quote it first.", product: "engineering", placeholder: "What do people do by hand today, and how often? For example: pay applications arrive as PDFs and get approved by email." },
  { id: "issue", name: "Something's wrong", line: "A number looks off, a connection broke, a form misbehaves.", product: "foundation", placeholder: "What did you see, where, and when? Include the job or customer if there is one." },
  { id: "improvement", name: "Improvement", line: "Make something that exists work better.", product: "workspace", placeholder: "What would make it better?" },
  { id: "question", name: "Ask your analyst", line: "Why did a number move? What does it mean? A plain answer.", product: "insight", placeholder: "What would you like to know? For example: why did gross margin drop in September, and should we worry?" },
];
const PRODUCTS: { id: RequestProduct; name: string }[] = [
  { id: "foundation", name: "Foundation · your data" },
  { id: "workspace", name: "Workspace · dashboards & reports" },
  { id: "insight", name: "Insight Review · your analyst" },
  { id: "engineering", name: "Engineering · apps" },
];
const BLOCKS = Object.keys(SKETCH_INFO) as SketchBlock[];

export default function RequestForm({
  action,
  initial,
  changeHoursLeft,
  canAsk = false,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  initial: { kind: RequestKind; product?: RequestProduct; title?: string; link?: string; from?: string };
  /* null when the plan has a dedicated analyst instead of an hour allowance */
  changeHoursLeft: number | null;
  /* questions go to the analyst, so only with Insight Review */
  canAsk?: boolean;
}) {
  const [kind, setKind] = useState<RequestKind>(initial.kind);
  const [product, setProduct] = useState<RequestProduct>(initial.product ?? KINDS.find((k) => k.id === initial.kind)!.product);
  const [title, setTitle] = useState(initial.title ?? "");
  const [blocks, setBlocks] = useState<SketchBlock[]>(initial.kind === "change" ? ["kpis", "line", "table"] : []);
  const cur = KINDS.find((k) => k.id === kind)!;
  const pick = (k: RequestKind) => {
    setKind(k);
    setProduct(KINDS.find((x) => x.id === k)!.product);
    if (k === "change" && !blocks.length) setBlocks(["kpis", "line", "table"]);
  };
  const toggle = (b: SketchBlock) => setBlocks((bs) => (bs.includes(b) ? bs.filter((x) => x !== b) : BLOCKS.filter((x) => bs.includes(x) || x === b)));

  return (
    <ActionForm action={action} className="req-form">
      {(errors) => (
        <>
          <input type="hidden" name="kind" value={kind} />
          {initial.link && <input type="hidden" name="link" value={initial.link} />}
          <fieldset className="req-kinds">
            <legend className="label">What kind of request?</legend>
            {KINDS.filter((k) => k.id !== "question" || canAsk).map((k) => (
              <button key={k.id} type="button" className={`req-kind p-${k.product}`} aria-pressed={kind === k.id} onClick={() => pick(k.id)}>
                <SolidIcon kind={k.product} size={22} />
                <span>
                  <b>{k.name}</b>
                  <small>{k.line}</small>
                </span>
              </button>
            ))}
          </fieldset>

          <div className="req-grid">
            <div className="stack">
              {initial.from && (
                <p className="small muted" style={{ margin: 0 }}>
                  Asked from <b>{initial.from}</b>
                </p>
              )}
              <label className="field">
                <span className="label">Title</span>
                <input name="title" className="input" required maxLength={140} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A short name for it" aria-invalid={!!errors.title} />
                {errors.title && <span className="error">{errors.title}</span>}
              </label>
              <label className="field">
                <span className="label">Details</span>
                <textarea name="detail" className="input" rows={5} maxLength={4000} placeholder={cur.placeholder} />
              </label>
              <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
                <label className="field" style={{ flex: "1 1 220px" }}>
                  <span className="label">What it&apos;s about</span>
                  <select name="product" className="input" value={product} onChange={(e) => setProduct(e.target.value as RequestProduct)}>
                    {PRODUCTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field" style={{ flex: "0 1 160px" }}>
                  <span className="label">How urgent</span>
                  <select name="priority" className="input" defaultValue={kind === "issue" ? "high" : "normal"}>
                    <option value="normal">Normal</option>
                    <option value="high">Urgent</option>
                    <option value="low">Whenever</option>
                  </select>
                </label>
              </div>
            </div>

            {kind === "change" && (
              <div className="stack">
                <span className="label">Sketch it (optional): pick the blocks</span>
                <div className="req-blocks">
                  {BLOCKS.map((b) => (
                    <label key={b} className={`req-block ${blocks.includes(b) ? "on" : ""}`}>
                      <input type="checkbox" name="sketch" value={b} checked={blocks.includes(b)} onChange={() => toggle(b)} />
                      <b>{SKETCH_INFO[b].name}</b>
                      <small>{SKETCH_INFO[b].hint}</small>
                    </label>
                  ))}
                </div>
                <SketchPreview blocks={blocks} title={title} />
                <p className="small muted" style={{ margin: 0 }}>
                  Your analyst builds the real page from these blocks and your numbers.
                  {changeHoursLeft === null ? " Your plan includes a dedicated analyst for changes." : ` You have ${changeHoursLeft} change ${changeHoursLeft === 1 ? "hour" : "hours"} left this month; most changes take 1 to 3.`}
                </p>
              </div>
            )}
            {kind === "app" && (
              <div className="req-aside">
                <b>How app requests work</b>
                <ol>
                  <li>You describe it here.</li>
                  <li>We ask a few questions, then send a fixed quote.</li>
                  <li>Once you approve the quote, you can follow the build on this board.</li>
                </ol>
              </div>
            )}
            {kind === "question" && (
              <div className="req-aside">
                <b>How questions work</b>
                <ol>
                  <li>Ask in your own words. If you came from a chart, it&apos;s attached.</li>
                  <li>Your analyst reads the numbers behind it and answers here, in plain English.</li>
                  <li>If the answer needs work (a fix, a new chart), it becomes a request on the board.</li>
                </ol>
              </div>
            )}
            {kind === "issue" && (
              <div className="req-aside">
                <b>Faster with the details</b>
                <p className="small">Say where you saw it (the dashboard or view) and the job, customer, or date. If a number looks wrong, the source system is often where it gets fixed; we&apos;ll tell you which.</p>
              </div>
            )}
          </div>

          <div className="row" style={{ gap: 10, marginTop: 6 }}>
            <Submit>Add to the board</Submit>
          </div>
        </>
      )}
    </ActionForm>
  );
}
