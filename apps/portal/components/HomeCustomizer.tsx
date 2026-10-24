"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import type { ActionResult } from "./ActionForm";

type Item = { id: string; title: string; from: string };

/* Choose and order what's on your Home page: drag to reorder (or use the
   arrows), remove with ×, add from what your dashboards already have. */
export default function HomeCustomizer({
  kpis, charts, panels, initial, action,
}: {
  kpis: Item[]; charts: Item[]; panels: { id: string; title: string }[];
  initial: { kpis: string[]; charts: string[]; panels: string[] };
  action: (p: ActionResult | null, f: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok && state.redirect) router.push(state.redirect);
  }, [state, router]);
  const [k, setK] = useState(initial.kpis);
  const [c, setC] = useState(initial.charts);
  const [p, setP] = useState(initial.panels);
  return (
    <form action={formAction} className="stack customizer">
      <Picker title="Key numbers" max={8} all={kpis} chosen={k} setChosen={setK} name="kpi" />
      <Picker title="Charts" max={6} all={charts} chosen={c} setChosen={setC} name="chart" />
      <section className="card">
        <h2>Panels</h2>
        <div className="toggle-grid">
          {panels.map((x) => (
            <label key={x.id} className={`toggle ${p.includes(x.id) ? "on" : ""}`}>
              <input type="checkbox" name="panel" value={x.id} checked={p.includes(x.id)} onChange={(e) => setP(e.target.checked ? [...p, x.id] : p.filter((y) => y !== x.id))} />
              <span className="toggle-dot" aria-hidden="true" />
              {x.title}
            </label>
          ))}
        </div>
      </section>
      <div className="row builder-save">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save my Home page"}
        </button>
        <Link href="/" className="btn btn-secondary">
          Cancel
        </Link>
        {state && !state.ok && <span className="notice risk">{state.message}</span>}
      </div>
    </form>
  );
}

function Picker({ title, max, all, chosen, setChosen, name }: { title: string; max: number; all: Item[]; chosen: string[]; setChosen: (x: string[]) => void; name: string }) {
  const [drag, setDrag] = useState<number | null>(null);
  const byId = useMemo(() => new Map(all.map((x) => [x.id, x])), [all]);
  const rest = all.filter((x) => !chosen.includes(x.id));
  const groups = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const x of rest) {
      const g = x.from.split(" · ")[0];
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(x);
    }
    return [...m.entries()];
  }, [rest]);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= chosen.length || from === to) return;
    const next = [...chosen];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setChosen(next);
  };
  if (!all.length) return null;
  return (
    <section className="card">
      <div className="panel-h">
        <h2>
          {title} on your Home <span className="small muted">({chosen.length} of up to {max})</span>
        </h2>
      </div>
      {chosen.length ? (
        <ol className="order-list">
          {chosen.map((id, i) => {
            const x = byId.get(id);
            if (!x) return null;
            return (
              <li
                key={id}
                draggable
                onDragStart={() => setDrag(i)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (drag !== null && drag !== i) {
                    move(drag, i);
                    setDrag(i);
                  }
                }}
                onDragEnd={() => setDrag(null)}
                className={drag === i ? "dragging" : ""}
              >
                <input type="hidden" name={name} value={id} />
                <span className="drag-handle" aria-hidden="true">
                  <Icon name="drag" />
                </span>
                <span className="order-title">
                  <b>{x.title}</b>
                  <span className="small muted">{x.from}</span>
                </span>
                <span className="sec-tools">
                  <button type="button" className="icon-btn" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move ${x.title} up`}>
                    <Icon name="up" />
                  </button>
                  <button type="button" className="icon-btn" onClick={() => move(i, i + 1)} disabled={i === chosen.length - 1} aria-label={`Move ${x.title} down`}>
                    <Icon name="down" />
                  </button>
                  <button type="button" className="icon-btn" onClick={() => setChosen(chosen.filter((y) => y !== id))} aria-label={`Remove ${x.title}`}>
                    <Icon name="x" />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="empty-note">Nothing chosen yet. Add some below.</p>
      )}
      {chosen.length < max && rest.length > 0 && (
        <details className="add-more">
          <summary className="btn btn-secondary btn-sm">
            <Icon name="plus" /> Add {title.toLowerCase()}
          </summary>
          {groups.map(([g, list]) => (
            <div key={g} className="add-group">
              <span className="small muted">{g}</span>
              <div className="chips">
                {list.map((x) => (
                  <button key={x.id} type="button" className="chip add-chip" onClick={() => setChosen([...chosen, x.id])}>
                    <Icon name="plus" /> {x.title}
                    <span className="muted">{x.from.split(" · ")[1]}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </details>
      )}
    </section>
  );
}
