"use client";

import { useState } from "react";
import ActionForm, { Submit, type ActionResult } from "./ActionForm";

export type AlertChoice = { kind: string; label: string; about: string; param?: { key: string; label: string; default: number; min: number; max: number; step: number } };

/* Pick what to be told about, set the threshold, choose email or not. */
export default function AlertForm({ action, choices, emailNote }: { action: (p: ActionResult | null, f: FormData) => Promise<ActionResult>; choices: AlertChoice[]; emailNote: string }) {
  const [kind, setKind] = useState(choices[0]?.kind ?? "");
  const c = choices.find((x) => x.kind === kind);
  return (
    <ActionForm action={action} className="stack" resetOnSuccess>
      {(errors) => (
        <>
          <fieldset className="alert-kinds">
            <legend className="sr-only">Tell me when</legend>
            {choices.map((x) => (
              <label key={x.kind} className={`alert-kind ${x.kind === kind ? "on" : ""}`}>
                <input type="radio" name="kind" value={x.kind} checked={x.kind === kind} onChange={() => setKind(x.kind)} />
                <span>
                  <b>{x.label}</b>
                  <span className="small muted">{x.about}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {c?.param && (
            <div className="field" key={c.kind}>
              <label htmlFor="al-param">{c.param.label}</label>
              <input id="al-param" name={c.param.key} className="input" type="number" min={c.param.min} max={c.param.max} step={c.param.step} defaultValue={c.param.default} required inputMode="numeric" aria-invalid={errors[c.param.key] ? true : undefined} />
              {errors[c.param.key] && <span className="error">{errors[c.param.key]}</span>}
            </div>
          )}
          <label className="row small" style={{ gap: 8 }}>
            <input type="checkbox" name="email" defaultChecked /> Email me too
          </label>
          <p className="small muted" style={{ margin: 0 }}>
            {emailNote}
          </p>
          <div>
            <Submit>Add alert</Submit>
          </div>
        </>
      )}
    </ActionForm>
  );
}
