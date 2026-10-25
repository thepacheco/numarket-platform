"use client";

import { useActionState, useEffect, useState } from "react";
import Icon from "./Icon";
import type { ActionResult } from "./ActionForm";

/* The pin on a dashboard number or chart: adds it to your Home page, or
   takes it off. */
export default function PinButton({
  id,
  pinned,
  action,
  view,
}: {
  id: string;
  pinned: boolean;
  action: (p: ActionResult | null, f: FormData) => Promise<ActionResult>;
  /* the view on screen right now (a job, a period, another way of showing it), if it isn't the full one */
  view?: { label: string; query: string };
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [on, setOn] = useState(pinned);
  const [ask, setAsk] = useState(false);
  useEffect(() => {
    if (state?.ok) setOn(state.message.startsWith("Pinned"));
    setAsk(false);
  }, [state]);
  /* drilled in? ask whether to keep this view or pin the whole thing */
  const choose = !!view && !on;
  return (
    <form action={formAction} className="pin-form">
      <input type="hidden" name="id" value={id} />
      <button
        type={choose ? "button" : "submit"}
        onClick={choose ? () => setAsk((a) => !a) : undefined}
        aria-expanded={choose ? ask : undefined}
        className={`pin-btn ${on ? "on" : ""}`}
        aria-pressed={on}
        disabled={pending}
        data-tip={state && !state.ok ? state.message : on ? "On your Home page. Click to remove." : "Pin to your Home page"}
      >
        <Icon name="pin" />
        <span className="sr-only">{on ? "Remove from Home" : "Pin to Home"}</span>
      </button>
      {choose && ask && (
        <div className="pin-ask" role="group" aria-label="Pin which view?">
          <b>Pin to Home</b>
          <button type="submit" name="view" value={view.query} className="pin-choice">
            <span>As you see it now</span>
            <small>{view.label}</small>
          </button>
          <button type="submit" name="view" value="" className="pin-choice">
            <span>The full view</span>
            <small>Everything you can see, last 12 months</small>
          </button>
        </div>
      )}
      {state && <span className={`pin-msg ${state.ok ? "" : "bad"}`} role="status">{state.message}</span>}
    </form>
  );
}
