"use client";

import { useState, type ReactNode } from "react";
import Icon from "./Icon";

type Line = { label: string; value: string; sure: boolean };

/* The paper-intake example: a photo of a handwritten form, read into fields
   the person checks before saving. The reading is staged here (the sample
   form is always the same); the check-and-save step is the real input form. */
export default function ScanDemo({ title, lines, children }: { title: string; lines: Line[]; children: ReactNode }) {
  const [step, setStep] = useState<"photo" | "reading" | "read">("photo");
  const read = () => {
    setStep("reading");
    window.setTimeout(() => setStep("read"), 1400);
  };
  return (
    <div className="scan-grid">
      <figure className={`paper ${step === "reading" ? "reading" : ""}`} aria-label={`Photo of a handwritten ${title.toLowerCase()}`}>
        <div className="paper-sheet">
          <div className="paper-h">
            <b>{title.toUpperCase()}</b>
            <span>Form 12 · rev. 3</span>
          </div>
          {lines.map((l) => (
            <div key={l.label} className="paper-row">
              <span>{l.label}</span>
              <em>{l.value}</em>
            </div>
          ))}
          <div className="paper-sign">
            <span>Signed</span>
            <em>~ L. O.</em>
          </div>
        </div>
        {step === "reading" && <span className="scan-line" aria-hidden="true" />}
        <figcaption className="small muted">Sample photo, taken on a phone at the end of the day</figcaption>
      </figure>
      <div className="scan-side">
        {step !== "read" ? (
          <div className="card stack">
            <h2>
              <Icon name="scan" /> 1. Take a photo
            </h2>
            <p className="muted" style={{ margin: 0 }}>
              In your workspace, you take a photo of the form or forward the scan. Here, try it with the sample on the left.
            </p>
            <div>
              <button type="button" className="btn btn-primary" onClick={read} disabled={step === "reading"}>
                {step === "reading" ? "Reading the form…" : "Read the sample form"}
              </button>
            </div>
          </div>
        ) : (
          <div className="card stack">
            <h2>
              <Icon name="check" /> 2. Check what it read, then save
            </h2>
            <ul className="scan-read">
              {lines.map((l) => (
                <li key={l.label}>
                  <span className="small muted">{l.label}</span>
                  <b>{l.value}</b>
                  <span className={`pill ${l.sure ? "good" : "watch"}`}>{l.sure ? "Clear" : "Check this one"}</span>
                </li>
              ))}
            </ul>
            <p className="small muted" style={{ margin: 0 }}>
              Anything it wasn&apos;t sure about is marked. Fix it below; the same checks as the form apply.
            </p>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
