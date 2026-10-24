"use client";

import { useActionState, useEffect, useState } from "react";
import Icon from "./Icon";
import type { ActionResult } from "./ActionForm";

/* The pin on a dashboard number or chart: adds it to your Home page, or
   takes it off. */
export default function PinButton({ id, pinned, action }: { id: string; pinned: boolean; action: (p: ActionResult | null, f: FormData) => Promise<ActionResult> }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [on, setOn] = useState(pinned);
  useEffect(() => {
    if (state?.ok) setOn(state.message.startsWith("Pinned"));
  }, [state]);
  return (
    <form action={formAction} className="pin-form">
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={`pin-btn ${on ? "on" : ""}`} aria-pressed={on} disabled={pending} title={state && !state.ok ? state.message : on ? "On your Home page. Click to remove." : "Pin to your Home page"}>
        <Icon name="pin" />
        <span className="sr-only">{on ? "Remove from Home" : "Pin to Home"}</span>
      </button>
      {state && <span className={`pin-msg ${state.ok ? "" : "bad"}`} role="status">{state.message}</span>}
    </form>
  );
}
