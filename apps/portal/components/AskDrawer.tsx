"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "./Icon";

/* "Ask about this dashboard": a button at the top of the page that opens the
   question box in a side panel, so the charts stay in view while you ask. */
export default function AskDrawer({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", key);
    /* put the cursor in the question box */
    window.setTimeout(() => panel.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input[name=q], textarea, input[type=text]")?.focus(), 60);
    return () => document.removeEventListener("keydown", key);
  }, [open]);
  return (
    <>
      <button type="button" className="btn btn-primary btn-sm ask-trigger" onClick={() => setOpen(true)} aria-expanded={open} data-tip="Ask a question about the numbers on this page, in plain words">
        <Icon name="chat" /> Ask
      </button>
      <div className={`drawer-back ${open ? "on" : ""}`} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside ref={panel} className={`drawer ${open ? "on" : ""}`} aria-label={title} aria-hidden={!open} inert={!open}>
        <div className="drawer-h">
          <h2>
            <Icon name="chat" /> {title}
          </h2>
          <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </>
  );
}
