"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Icon from "./Icon";

type Col = { field: string; label: string; numeric: boolean };

/* "Add a filter": pick a column, how to compare, and a value. The filter
   joins the others in the page address, so the view can be saved, shared,
   downloaded, or turned into an alert exactly as it looks. */
export default function AddFilter({ columns, base, query, where }: { columns: Col[]; base: string; query: string; where: string }) {
  const router = useRouter();
  const box = useRef<HTMLDetailsElement>(null);
  const [field, setField] = useState(columns[0]?.field ?? "");
  const col = columns.find((c) => c.field === field);
  const [op, setOp] = useState(col?.numeric ? "gt" : "has");
  const [value, setValue] = useState("");
  const pick = (f: string) => {
    setField(f);
    setOp(columns.find((c) => c.field === f)?.numeric ? "gt" : "has");
  };
  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    const val = value.replace(/[|~]/g, " ").trim();
    if (!val) return;
    const w = [where, `${field}~${op}~${val}`].filter(Boolean).join("|");
    const q = new URLSearchParams(query);
    q.set("w", w);
    if (box.current) box.current.open = false;
    setValue("");
    router.push(`${base}?${q.toString()}`);
  };
  return (
    <details ref={box} className="view-save add-filter">
      <summary className="btn btn-secondary btn-sm">
        <Icon name="plus" /> Add a filter
      </summary>
      <form className="view-pop card stack" onSubmit={apply}>
        <div className="field">
          <label htmlFor="af-col">Column</label>
          <select id="af-col" className="input" value={field} onChange={(e) => pick(e.target.value)}>
            {columns.map((c) => (
              <option key={c.field} value={c.field}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="af-op">Where it</label>
            <select id="af-op" className="input" value={op} onChange={(e) => setOp(e.target.value)}>
              {col?.numeric ? (
                <>
                  <option value="gt">is more than</option>
                  <option value="lt">is less than</option>
                  <option value="eq">is exactly</option>
                </>
              ) : (
                <>
                  <option value="has">contains</option>
                  <option value="eq">is</option>
                </>
              )}
            </select>
          </div>
          <div className="field">
            <label htmlFor="af-val">Value</label>
            <input id="af-val" className="input" value={value} onChange={(e) => setValue(e.target.value)} inputMode={col?.numeric ? "decimal" : undefined} type={col?.numeric ? "number" : "text"} step="any" required maxLength={60} />
          </div>
        </div>
        {col?.numeric && <p className="small muted" style={{ margin: 0 }}>Plain numbers: 25000, not $25K. Percentages as decimals: 0.15 for 15%.</p>}
        <div>
          <button type="submit" className="btn btn-primary btn-sm">
            Apply filter
          </button>
        </div>
      </form>
    </details>
  );
}
