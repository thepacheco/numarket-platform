"use client";

import { useActionState, useMemo, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export type ActionResult = { ok: boolean; message: string; errors?: Record<string, string> };
type Action = (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;

/* A form bound to a server action, with an inline result message. Field
   errors are passed to children so each field can show its own. */
export default function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: Action;
  children: ReactNode | ((errors: Record<string, string>) => ReactNode);
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  /* a fresh key after each successful submit clears the fields */
  const formKey = useMemo(() => (resetOnSuccess && state?.ok ? Math.random().toString(36).slice(2) : "form"), [state, resetOnSuccess]);
  return (
    <form action={formAction} className={className} key={formKey}>
      {typeof children === "function" ? children(state?.errors ?? {}) : children}
      {state && (
        <p className={`notice ${state.ok ? "good" : "risk"}`} role="status" style={{ marginTop: 10 }}>
          {state.message}
        </p>
      )}
    </form>
  );
}

export function Submit({ children, className = "btn btn-primary", name, value, disabled }: { children: ReactNode; className?: string; name?: string; value?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} name={name} value={value} disabled={pending || disabled} aria-disabled={pending || disabled}>
      {pending ? "Working…" : children}
    </button>
  );
}
