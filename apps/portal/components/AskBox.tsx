"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import Icon from "./Icon";
import type { AskState } from "@/lib/ask";

/* Ask a question; answers stack up below (newest first). Compact mode, for
   Home and dashboards, keeps only the latest answer and links to the full
   Ask Your Data page. */
export default function AskBox({
  action, suggested, defs, compact = false, placeholder = "Ask a question about your numbers", history,
}: { action: (p: AskState | null, f: FormData) => Promise<AskState>; suggested: string[]; defs: Record<string, string>; compact?: boolean; placeholder?: string; history?: { q: string; when: string; answered: boolean }[] }) {
  const [state, formAction, pending] = useActionState(action, null);
  const input = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const ask = (q: string) => {
    if (!input.current || !form.current) return;
    input.current.value = q;
    form.current.requestSubmit();
  };
  /* this visit's questions join the saved history at the top */
  const asked = state?.items.map((it) => it.question) ?? [];
  const past = (history ?? []).filter((h) => !asked.some((q) => q.toLowerCase() === h.q.toLowerCase()));
  const box = (
    <div className={`ask ${compact ? "ask-compact" : ""}`}>
      <form ref={form} action={formAction} className="ask-box">
        <Icon name="chat" />
        <input ref={input} name="q" className="input" placeholder={placeholder} maxLength={300} autoComplete="off" aria-label="Your question" />
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Thinking…" : "Ask"}
        </button>
      </form>
      <div className="ask-suggest">
        {suggested.map((s) => (
          <button key={s} type="button" className="chip" onClick={() => ask(s)} disabled={pending}>
            {s}
          </button>
        ))}
      </div>
      {state?.error && <p className="notice risk">{state.error}</p>}
      {(compact ? state?.items.slice(0, 1) : state?.items)?.map((it, i) => (
        <section key={(state?.items.length ?? 0) - i} className={`card ask-answer${it.answer.ok ? "" : " ask-miss"}`}>
          <p className="ask-q">{it.question}</p>
          <h2>{it.answer.title}</h2>
          <p style={{ margin: "0 0 10px" }}>{it.answer.text}</p>
          {it.answer.table && it.answer.table.rows.length > 0 && (
            <div className="table-wrap">
              <table className="t">
                <thead>
                  <tr>
                    {it.answer.table.columns.map((h, j) => (
                      <th key={j} className={it.answer.table!.numeric[j] ? "num" : ""}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {it.answer.table.rows.map((r, k) => (
                    <tr key={k}>
                      {r.map((v, j) => (
                        <td key={j} className={it.answer.table!.numeric[j] ? "num" : ""}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {it.answer.ok && (
            <details className="ask-how">
              <summary>How this was answered</summary>
              <p className="small">
                From <strong>{it.answer.basis}</strong>, data updated {it.updated}. Only rows you&apos;re allowed to see were used.
              </p>
              <ul className="small">
                {it.answer.defs.map((d) => (
                  <li key={d}>
                    <strong>{d}:</strong> {defs[d] ?? ""}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      ))}
      {compact && state?.items.length ? (
        <Link href="/ask" className="small ask-more">
          Ask more on the Ask Your Data page
        </Link>
      ) : null}
    </div>
  );
  if (!history) return box;
  return (
    <div className="ask-layout">
      {box}
      <aside className="card ask-history" aria-label="Your recent questions">
        <h2>
          <Icon name="history" /> Your recent questions
        </h2>
        {asked.length + past.length === 0 ? (
          <p className="small muted">Questions you ask show up here, so you can ask them again when the data updates.</p>
        ) : (
          <ul>
            {asked.map((q, i) => (
              <li key={`now-${i}`}>
                <button type="button" onClick={() => ask(q)} disabled={pending} data-tip="Ask again with the latest data">
                  <span>{q}</span>
                  <span className="small muted">Just now</span>
                </button>
              </li>
            ))}
            {past.map((h) => (
              <li key={h.q}>
                <button type="button" onClick={() => ask(h.q)} disabled={pending} data-tip="Ask again with the latest data">
                  <span>{h.q}</span>
                  <span className="small muted">
                    {h.when}
                    {h.answered ? "" : " · not answered"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
