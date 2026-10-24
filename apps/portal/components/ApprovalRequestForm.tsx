"use client";

import ActionForm, { Submit, type ActionResult } from "./ActionForm";

/* Ask for a change order (or scope change) to be approved. */
export default function ApprovalRequestForm({ action, jobs, causes, jobLabel }: { action: (p: ActionResult | null, f: FormData) => Promise<ActionResult>; jobs: { code: string; name: string }[]; causes: string[]; jobLabel: string }) {
  return (
    <ActionForm action={action} className="stack" resetOnSuccess>
      {(errors) => (
        <>
          <div className="field">
            <label htmlFor="a-job">{jobLabel}</label>
            <select id="a-job" name="job" className="input" required defaultValue={jobs.length === 1 ? jobs[0].code : ""}>
              <option value="" disabled>
                Choose…
              </option>
              {jobs.map((j) => (
                <option key={j.code} value={j.code}>
                  {j.name} ({j.code})
                </option>
              ))}
            </select>
            {errors.job && <span className="error">{errors.job}</span>}
          </div>
          <div className="field">
            <label htmlFor="a-title">What changed</label>
            <input id="a-title" name="title" className="input" required maxLength={200} />
            {errors.title && <span className="error">{errors.title}</span>}
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="a-cause">Cause</label>
              <select id="a-cause" name="cause" className="input" required defaultValue="">
                <option value="" disabled>
                  Choose…
                </option>
                {causes.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              {errors.cause && <span className="error">{errors.cause}</span>}
            </div>
            <div className="field">
              <label htmlFor="a-amount">Amount ($)</label>
              <input id="a-amount" name="amount" className="input" type="number" min={100} step={1} required inputMode="decimal" />
              {errors.amount && <span className="error">{errors.amount}</span>}
            </div>
          </div>
          <div className="field">
            <label htmlFor="a-reason">Why</label>
            <textarea id="a-reason" name="reason" className="input" rows={3} maxLength={600} required />
            {errors.reason && <span className="error">{errors.reason}</span>}
          </div>
          <div>
            <Submit>Send for approval</Submit>
          </div>
        </>
      )}
    </ActionForm>
  );
}
