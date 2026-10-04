"use client";

import ActionForm, { Submit, type ActionResult } from "./ActionForm";

export default function UpdateNow({ action, label = "Update now" }: { action: (p: ActionResult | null) => Promise<ActionResult>; label?: string }) {
  return (
    <ActionForm action={action as (p: ActionResult | null, f: FormData) => Promise<ActionResult>}>
      <Submit className="btn btn-secondary btn-sm">{label}</Submit>
    </ActionForm>
  );
}
