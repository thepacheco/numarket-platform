"use client";

import { useState } from "react";

/* A statement you can open and close, like a P&L in a spreadsheet: each
   section starts rolled up to its total; click it to see its accounts, and
   click an account to see the rows behind it. Values arrive formatted
   from the server. */
export type MatrixLine = { label: string; kind: "group" | "line" | "subtotal" | "total"; current: string; prior: string; change: string; share: string };
type StatementLine = MatrixLine;
type Section = { label: string; lines: StatementLine[]; total: StatementLine | null };

function sections(lines: StatementLine[]) {
  const out: (Section | StatementLine)[] = [];
  let cur: Section | null = null;
  for (const l of lines) {
    if (l.kind === "group") {
      cur = { label: l.label, lines: [], total: null };
      out.push(cur);
    } else if (l.kind === "line" && cur) cur.lines.push(l);
    else if (l.kind === "subtotal" && cur) {
      cur.total = l;
      cur = null;
    } else out.push(l);
  }
  return out;
}

export default function MatrixTable({
  title,
  caption,
  lines,
  hasPrior,
  priorLabel,
  accountHref,
}: {
  title: string;
  caption: string | null;
  lines: StatementLine[];
  hasPrior: boolean;
  priorLabel: string;
  /* where each account's rows are in Explore */
  accountHref: Record<string, string>;
}) {
  const parts = sections(lines);
  const names = parts.filter((p): p is Section => "lines" in p).map((p) => p.label);
  const [open, setOpen] = useState<string[]>([]);
  const toggle = (n: string) => setOpen((o) => (o.includes(n) ? o.filter((x) => x !== n) : [...o, n]));
  const cols = hasPrior ? 5 : 3;
  const Cells = ({ l }: { l: StatementLine }) => (
    <>
      <td className="num tnum">{l.current}</td>
      {hasPrior && (
        <>
          <td className="num tnum muted">{l.prior}</td>
          <td className="num tnum">{l.change}</td>
        </>
      )}
      <td className="num tnum muted">{l.share}</td>
    </>
  );

  return (
    <section className="b-card span-3 matrix-card" aria-label={title}>
      <header className="b-head">
        <h3 className="b-title">{title}</h3>
        <span className="matrix-tools">
          {caption && <span className="b-caption">{caption}</span>}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(open.length === names.length ? [] : names)}>
            {open.length === names.length ? "Roll up" : "Open every account"}
          </button>
        </span>
      </header>
      <div className="b-table-wrap">
        <table className="b-table b-statement matrix">
          <thead>
            <tr>
              <th scope="col">Account</th>
              <th scope="col" className="num">
                This period
              </th>
              {hasPrior && (
                <>
                  <th scope="col" className="num">
                    {priorLabel}
                  </th>
                  <th scope="col" className="num">
                    Change
                  </th>
                </>
              )}
              <th scope="col" className="num">
                % of revenue
              </th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p, i) => {
              if (!("lines" in p))
                return (
                  <tr key={i} className={`st-${p.kind}`}>
                    <td>{p.label}</td>
                    <Cells l={p} />
                  </tr>
                );
              const isOpen = open.includes(p.label);
              return [
                <tr key={`${i}-h`} className={`st-group mx-head ${isOpen ? "open" : ""}`}>
                  {isOpen || !p.total ? (
                    <td colSpan={cols}>
                      <button type="button" className="mx-toggle" aria-expanded={isOpen} onClick={() => toggle(p.label)}>
                        <span aria-hidden="true">▸</span> {p.label} <small>{p.lines.length} accounts</small>
                      </button>
                    </td>
                  ) : (
                    <>
                      <td>
                        <button type="button" className="mx-toggle" aria-expanded={false} onClick={() => toggle(p.label)}>
                          <span aria-hidden="true">▸</span> {p.label} <small>{p.lines.length} accounts</small>
                        </button>
                      </td>
                      <Cells l={p.total} />
                    </>
                  )}
                </tr>,
                ...(isOpen
                  ? [
                      ...p.lines.map((l, j) => (
                        <tr key={`${i}-${j}`} className="st-line mx-line">
                          <td>{accountHref[l.label] ? <a href={accountHref[l.label]}>{l.label}</a> : l.label}</td>
                          <Cells l={l} />
                        </tr>
                      )),
                      ...(p.total
                        ? [
                            <tr key={`${i}-t`} className="st-subtotal">
                              <td>{p.total.label}</td>
                              <Cells l={p.total} />
                            </tr>,
                          ]
                        : []),
                    ]
                  : []),
              ];
            })}
          </tbody>
        </table>
      </div>
      <p className="b-note">Click a section to see its accounts, and an account to see every row behind it.</p>
    </section>
  );
}
