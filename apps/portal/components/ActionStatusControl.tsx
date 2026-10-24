"use client";

import { useActionState } from "react";
import type { ActionResult } from "./ActionForm";

const STEPS = [
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "done", label: "Done" },
] as const;

/* Open → In progress → Done for one action item, as a three-way switch.
   People who can't move it see where it stands, read-only. */
export default function ActionStatusControl({ review, idx, status, canEdit, action }: { review: string; idx: number; status: string; canEdit: boolean; action: (p: ActionResult | null, f: FormData) => Promise<ActionResult> }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="status-seg-wrap">
      <input type="hidden" name="review" value={review} />
      <input type="hidden" name="idx" value={idx} />
      <div className="range-seg status-seg" role="group" aria-label="Status">
        {STEPS.map((s) => (
          <button key={s.id} type="submit" name="status" value={s.id} className={s.id === status ? "on" : ""} aria-pressed={s.id === status} disabled={!canEdit || pending || s.id === status} data-tip={canEdit ? undefined : "Only the owner of this item or an admin can change it"}>
            {s.label}
          </button>
        ))}
      </div>
      {state && !state.ok && (
        <span className="small risk-text" role="status">
          {state.message}
        </span>
      )}
    </form>
  );
}
