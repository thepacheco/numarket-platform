"use client";

import { useState } from "react";
import ActionForm, { Submit, type ActionResult } from "./ActionForm";
import Icon from "./Icon";

/* "Alert me" on an explored view: be told when a new row matches the
   filters, or when a column's total crosses a line. */
export default function ViewAlertForm({ action, slug, query, numeric, name, emailNote }: { action: (p: ActionResult | null, f: FormData) => Promise<ActionResult>; slug: string; query: string; numeric: { field: string; label: string }[]; name: string; emailNote: string }) {
  const [cond, setCond] = useState<"rows" | "total">("rows");
  return (
    <details className="view-save">
      <summary className="btn btn-primary btn-sm">
        <Icon name="bell" /> Alert me
      </summary>
      <div className="view-pop card view-pop-right">
        <ActionForm action={action} className="stack">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="q" value={query} />
          <div className="field">
            <label htmlFor="va-name">Name</label>
            <input id="va-name" name="name" className="input" defaultValue={name} required maxLength={80} />
          </div>
          <fieldset className="alert-kinds">
            <legend className="small muted">Tell me when</legend>
            <label className={`alert-kind ${cond === "rows" ? "on" : ""}`}>
              <input type="radio" name="cond" value="rows" checked={cond === "rows"} onChange={() => setCond("rows")} />
              <span>
                <b>Something new shows up here</b>
                <span className="small muted">A row that matches these filters and wasn&apos;t here before.</span>
              </span>
            </label>
            {numeric.length > 0 && (
              <label className={`alert-kind ${cond === "total" ? "on" : ""}`}>
                <input type="radio" name="cond" value="total" checked={cond === "total"} onChange={() => setCond("total")} />
                <span>
                  <b>A total crosses a line</b>
                  <span className="small muted">The total of a column, for these filters, goes above or below a number.</span>
                </span>
              </label>
            )}
          </fieldset>
          {cond === "total" && (
            <div className="grid-3 va-total">
              <select name="column" className="input" aria-label="Column">
                {numeric.map((c) => (
                  <option key={c.field} value={c.field}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select name="op" className="input" aria-label="Above or below">
                <option value="above">goes above</option>
                <option value="below">goes below</option>
              </select>
              <input name="amount" className="input" type="number" step="any" required inputMode="decimal" aria-label="Amount" placeholder="25000" />
            </div>
          )}
          <label className="row small" style={{ gap: 8 }}>
            <input type="checkbox" name="email" defaultChecked /> Email me too
          </label>
          <p className="small muted" style={{ margin: 0 }}>
            Checked at every update; shows on the bell. {emailNote}
          </p>
          <div>
            <Submit>Set the alert</Submit>
          </div>
        </ActionForm>
      </div>
    </details>
  );
}
