"use client";

import { useState } from "react";
import ActionForm, { Submit, type ActionResult } from "./ActionForm";

type B = { display_name: string; primary_color: string; accent_color: string; logo_text: string | null; signin_message: string | null; report_footer: string | null };

/* Branding with a live preview. The server checks contrast-safe shades. */
export default function BrandingForm({ action, initial, locked }: { action: (p: ActionResult | null, f: FormData) => Promise<ActionResult>; initial: B; locked: boolean }) {
  const [b, setB] = useState(initial);
  const set = (k: keyof B) => (e: React.ChangeEvent<HTMLInputElement>) => setB({ ...b, [k]: e.target.value });
  return (
    <div className="grid-2" style={{ alignItems: "start" }}>
      <ActionForm action={action} className="card stack">
        <fieldset disabled={locked} className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
          <div className="field">
            <label htmlFor="dn">Display name</label>
            <input id="dn" name="display_name" className="input" value={b.display_name} onChange={set("display_name")} maxLength={60} />
          </div>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="pc">Primary color</label>
              <input id="pc" name="primary_color" type="color" className="input" style={{ padding: 4 }} value={b.primary_color} onChange={set("primary_color")} />
            </div>
            <div className="field">
              <label htmlFor="ac">Accent color</label>
              <input id="ac" name="accent_color" type="color" className="input" style={{ padding: 4 }} value={b.accent_color} onChange={set("accent_color")} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="lt">Logo initials</label>
            <input id="lt" name="logo_text" className="input" value={b.logo_text ?? ""} onChange={set("logo_text")} maxLength={3} />
            <span className="help">Logo image uploads arrive with file storage.</span>
          </div>
          <div className="field">
            <label htmlFor="sm">Sign-in page message</label>
            <input id="sm" name="signin_message" className="input" value={b.signin_message ?? ""} onChange={set("signin_message")} maxLength={200} />
          </div>
          <div className="field">
            <label htmlFor="rf">Report footer</label>
            <input id="rf" name="report_footer" className="input" value={b.report_footer ?? ""} onChange={set("report_footer")} maxLength={120} />
          </div>
          {!locked && (
            <div>
              <Submit>Save branding</Submit>
            </div>
          )}
        </fieldset>
      </ActionForm>
      <div className="card" aria-label="Preview">
        <p className="eyebrow">Preview</p>
        <div className="row" style={{ gap: 10, margin: "10px 0 14px" }}>
          <span className="logo-chip" style={{ background: b.primary_color }}>{(b.logo_text ?? "").toUpperCase()}</span>
          <b>{b.display_name}</b>
        </div>
        <div className="row">
          <span className="btn btn-primary" style={{ background: b.primary_color }}>
            Primary button
          </span>
          <span className="pill" style={{ background: b.accent_color, color: "#fff" }}>
            Accent
          </span>
        </div>
        <div className="report-head" style={{ background: b.primary_color, marginTop: 14, borderRadius: 12 }}>
          <span className="logo-chip">{(b.logo_text ?? "").toUpperCase()}</span>
          <div>
            <b>{b.display_name}</b>
            <div className="small" style={{ opacity: 0.85 }}>
              Weekly status report
            </div>
          </div>
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>
          {b.report_footer}
        </p>
      </div>
    </div>
  );
}
