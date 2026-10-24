"use client";

import { useState } from "react";
import { estimateTotals, type EstimateData, type EstimateLine } from "@numarket/db/demo/apps";
import ActionForm, { Submit, type ActionResult } from "./ActionForm";
import Icon from "./Icon";

const money = (v: number) => v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/* Line items with live totals. The server checks and computes everything
   again when it's saved. */
export default function EstimateBuilder({ action, sections, initial, id, suggestedContingency, readOnly }: { action: (p: ActionResult | null, f: FormData) => Promise<ActionResult>; sections: string[]; initial: EstimateData; id?: string; suggestedContingency?: number | null; readOnly?: boolean }) {
  const [lines, setLines] = useState<EstimateLine[]>(initial.lines.length ? initial.lines : [{ section: sections[0], description: "", qty: 1, unit: "", unitCost: 0 }]);
  const [pcts, setPcts] = useState({ overheadPct: initial.overheadPct, contingencyPct: initial.contingencyPct, profitPct: initial.profitPct });
  const t = estimateTotals({ lines, ...pcts });
  const set = (i: number, patch: Partial<EstimateLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <ActionForm action={action} className="estimate">
      {(errors) => (
        <>
          {id && <input type="hidden" name="id" value={id} />}
          <input type="hidden" name="lines" value={JSON.stringify(lines)} />
          <div className="grid-2">
            <div className="field">
              <label htmlFor="e-name">Estimate name</label>
              <input id="e-name" name="name" className="input" defaultValue={initial.name} required maxLength={120} disabled={readOnly} aria-invalid={errors.name ? true : undefined} />
              {errors.name && <span className="error">{errors.name}</span>}
            </div>
            <div className="field">
              <label htmlFor="e-customer">For</label>
              <input id="e-customer" name="customer" className="input" defaultValue={initial.customer} required maxLength={120} disabled={readOnly} aria-invalid={errors.customer ? true : undefined} />
              {errors.customer && <span className="error">{errors.customer}</span>}
            </div>
          </div>

          <div className="table-wrap est-lines">
            <table>
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Description</th>
                  <th className="num">Qty</th>
                  <th>Unit</th>
                  <th className="num">Unit cost</th>
                  <th className="num">Amount</th>
                  <th aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i}>
                    <td>
                      <select className="input" value={l.section} onChange={(e) => set(i, { section: e.target.value })} disabled={readOnly} aria-label="Section">
                        {sections.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input className="input" value={l.description} onChange={(e) => set(i, { description: e.target.value })} maxLength={140} disabled={readOnly} aria-label="Description" />
                    </td>
                    <td className="num">
                      <input className="input num" type="number" min={0} step="any" value={l.qty} onChange={(e) => set(i, { qty: Number(e.target.value) })} disabled={readOnly} aria-label="Quantity" />
                    </td>
                    <td>
                      <input className="input" value={l.unit} onChange={(e) => set(i, { unit: e.target.value })} maxLength={20} disabled={readOnly} aria-label="Unit" placeholder="hours" />
                    </td>
                    <td className="num">
                      <input className="input num" type="number" min={0} step="any" value={l.unitCost} onChange={(e) => set(i, { unitCost: Number(e.target.value) })} disabled={readOnly} aria-label="Unit cost" />
                    </td>
                    <td className="num tnum">{money(l.qty * l.unitCost)}</td>
                    <td>
                      {!readOnly && lines.length > 1 && (
                        <button type="button" className="icon-btn" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label="Remove line" data-tip="Remove this line">
                          <Icon name="x" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {errors.lines && <p className="error">{errors.lines}</p>}
          {!readOnly && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLines((ls) => [...ls, { section: ls[ls.length - 1]?.section ?? sections[0], description: "", qty: 1, unit: "", unitCost: 0 }])}>
              <Icon name="plus" /> Add a line
            </button>
          )}

          <div className="est-foot">
            <div className="est-pcts">
              {(
                [
                  ["overheadPct", "Overhead", 30],
                  ["contingencyPct", "Contingency", 25],
                  ["profitPct", "Profit", 40],
                ] as const
              ).map(([k, label, max]) => (
                <div className="field" key={k}>
                  <label htmlFor={`e-${k}`}>{label} %</label>
                  <input id={`e-${k}`} name={k} className="input num" type="number" min={0} max={max} step="0.5" value={pcts[k]} onChange={(e) => setPcts((p) => ({ ...p, [k]: Number(e.target.value) }))} disabled={readOnly} aria-invalid={errors[k] ? true : undefined} />
                  {errors[k] && <span className="error">{errors[k]}</span>}
                  {k === "contingencyPct" && suggestedContingency != null && pcts.contingencyPct < suggestedContingency && (
                    <span className="help">Your recent work suggests at least {suggestedContingency}%.</span>
                  )}
                </div>
              ))}
            </div>
            <dl className="est-totals">
              {t.bySection.map(([s, v]) => (
                <div key={s}>
                  <dt>{s}</dt>
                  <dd className="tnum">{money(v)}</dd>
                </div>
              ))}
              <div className="sub">
                <dt>Direct cost</dt>
                <dd className="tnum">{money(t.direct)}</dd>
              </div>
              <div>
                <dt>Overhead</dt>
                <dd className="tnum">{money(t.overhead)}</dd>
              </div>
              <div>
                <dt>Contingency</dt>
                <dd className="tnum">{money(t.contingency)}</dd>
              </div>
              <div>
                <dt>Profit</dt>
                <dd className="tnum">{money(t.profit)}</dd>
              </div>
              <div className="total">
                <dt>Price</dt>
                <dd className="tnum">{money(t.total)}</dd>
              </div>
            </dl>
          </div>
          {!readOnly && (
            <div className="field">
              <label htmlFor="e-note">Notes</label>
              <textarea id="e-note" name="note" className="input" rows={2} maxLength={500} defaultValue={initial.note} placeholder="Assumptions, exclusions, what the price is good for" />
            </div>
          )}
          {!readOnly && (
            <div>
              <Submit>{id ? "Save changes" : "Save estimate"}</Submit>
            </div>
          )}
        </>
      )}
    </ActionForm>
  );
}
