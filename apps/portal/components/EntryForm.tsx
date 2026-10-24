"use client";

import ActionForm, { Submit, type ActionResult } from "./ActionForm";

type Field = { key: string; label: string; type: "select" | "date" | "number" | "text"; required?: boolean; options?: string[] | "jobs"; min?: number; max?: number; step?: number; maxLength?: number; help?: string };

/* An input screen, phone-first. The server validates everything again. */
export default function EntryForm({ action, screen, fields, jobs, today, defaults, via, submitLabel = "Save entry" }: { action: (p: ActionResult | null, f: FormData) => Promise<ActionResult>; screen: string; fields: Field[]; jobs: { code: string; name: string }[]; today: string; defaults?: Record<string, string>; via?: string; submitLabel?: string }) {
  return (
    <ActionForm action={action} className="stack" resetOnSuccess>
      {(errors) => (
        <>
          <input type="hidden" name="screen" value={screen} />
          {via && <input type="hidden" name="via" value={via} />}
          {fields.map((f) => {
            const id = `f-${f.key}`;
            const err = errors[f.key];
            const common = { id, name: f.key, className: "input", "aria-invalid": err ? true : undefined, "aria-describedby": f.help || err ? `${id}-d` : undefined, required: f.required };
            return (
              <div className="field" key={f.key}>
                <label htmlFor={id}>
                  {f.label}
                  {!f.required && <span className="muted" style={{ fontWeight: 400 }}> (optional)</span>}
                </label>
                {f.type === "select" ? (
                  <select {...common} defaultValue={defaults?.[f.key] ?? (f.options === "jobs" && jobs.length === 1 ? jobs[0].code : "")}>
                    <option value="" disabled>
                      Choose…
                    </option>
                    {f.options === "jobs"
                      ? jobs.map((j) => (
                          <option key={j.code} value={j.code}>
                            {j.name} ({j.code})
                          </option>
                        ))
                      : (f.options ?? []).map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                  </select>
                ) : f.type === "text" && (f.maxLength ?? 0) > 120 ? (
                  <textarea {...common} maxLength={f.maxLength} rows={3} defaultValue={defaults?.[f.key]} />
                ) : (
                  <input
                    {...common}
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    inputMode={f.type === "number" ? "decimal" : undefined}
                    min={f.type === "number" ? f.min : undefined}
                    max={f.type === "number" ? f.max : f.type === "date" ? today : undefined}
                    step={f.step}
                    maxLength={f.maxLength}
                    defaultValue={defaults?.[f.key] ?? (f.type === "date" ? today : undefined)}
                  />
                )}
                {(err || f.help) && (
                  <span id={`${id}-d`} className={err ? "error" : "help"}>
                    {err ?? f.help}
                  </span>
                )}
              </div>
            );
          })}
          <div>
            <Submit>{submitLabel}</Submit>
          </div>
        </>
      )}
    </ActionForm>
  );
}
