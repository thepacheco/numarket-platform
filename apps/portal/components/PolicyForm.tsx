"use client";

import ActionForm, { Submit, type ActionResult } from "./ActionForm";

const METHODS = [
  { id: "microsoft", label: "Sign in with Microsoft", note: "Second step handled by your Microsoft account" },
  { id: "google", label: "Sign in with Google", note: "Second step handled by your Google account" },
  { id: "password", label: "Email and password", note: "Authenticator app or passkey required" },
  { id: "sso", label: "Company single sign-on (SAML/OIDC)", note: "Command plan, or an add-on on Operate" },
];

type Policy = { allowed_methods: string[]; allowed_email_domains: string[]; ip_allowlist: string[]; session_hours: number; idle_minutes: number; export_roles: string[]; require_approval: boolean };

/* The tenant security policy form. The server re-validates everything and
   refuses an allowlist that would lock out the person saving it. */
export default function PolicyForm({ action, policy: p, canEdit, isDemo, ip }: { action: (prev: ActionResult | null, f: FormData) => Promise<ActionResult>; policy: Policy; canEdit: boolean; isDemo: boolean; ip: string | null }) {
  return (
    <ActionForm action={action} className="stack">
      {(errors) => (
        <fieldset disabled={!canEdit} className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
          <section className="card stack">
            <h2>Sign-in methods</h2>
            {isDemo && <p className="small muted" style={{ marginTop: -6 }}>The demo uses one-click demo sign-in. Real workspaces choose from these:</p>}
            {METHODS.map((m) => (
              <label key={m.id} className="check">
                <input type="checkbox" name="methods" value={m.id} defaultChecked={p.allowed_methods.includes(m.id)} />
                <span>
                  {m.label}
                  <span className="small muted" style={{ display: "block" }}>
                    {m.note}
                  </span>
                </span>
              </label>
            ))}
            {errors.methods && <span className="error small">{errors.methods}</span>}
            <label className="check">
              <input type="checkbox" checked disabled readOnly />
              <span>
                Require a second sign-in step for everyone
                <span className="small muted" style={{ display: "block" }}>
                  Always on. Only numarket can turn it off, and only on request.
                </span>
              </span>
            </label>
          </section>

          <section className="card stack">
            <h2>Who and where</h2>
            <div className="field">
              <label htmlFor="domains">Allowed email domains for invitations</label>
              <input id="domains" name="domains" className="input" defaultValue={p.allowed_email_domains.join(", ")} placeholder="clientco.com" aria-invalid={errors.domains ? true : undefined} />
              <span className={errors.domains ? "error" : "help"}>{errors.domains ?? "Leave empty to allow any domain."}</span>
            </div>
            <div className="field">
              <label htmlFor="ip">Only allow access from these networks</label>
              <textarea id="ip" name="ip_allowlist" className="input" defaultValue={p.ip_allowlist.join("\n")} placeholder={"203.0.113.0/24\n198.51.100.7"} aria-invalid={errors.ip_allowlist ? true : undefined} />
              <span className={errors.ip_allowlist ? "error" : "help"}>
                {errors.ip_allowlist ?? `One range per line. Use your office or VPN's fixed addresses. Leave empty to allow any network. Your current address is ${ip ?? "unknown"}.`}
              </span>
            </div>
            <label className="check">
              <input type="checkbox" name="require_approval" defaultChecked={p.require_approval} />
              <span>New people need an admin&apos;s approval before their first sign-in</span>
            </label>
          </section>

          <section className="card stack">
            <h2>Sessions and exports</h2>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="sh">Sign in again after (hours)</label>
                <input id="sh" name="session_hours" type="number" min={1} max={24} className="input" defaultValue={p.session_hours} />
              </div>
              <div className="field">
                <label htmlFor="idle">Sign out after inactivity (minutes)</label>
                <input id="idle" name="idle_minutes" type="number" min={5} max={240} className="input" defaultValue={p.idle_minutes} />
              </div>
            </div>
            <div className="field">
              <span className="label">Who can download data (CSV and PDF)</span>
              <div className="row">
                {["owner", "admin", "editor", "viewer"].map((r) => (
                  <label key={r} className="check">
                    <input type="checkbox" name="export_roles" value={r} defaultChecked={p.export_roles.includes(r)} /> {r[0].toUpperCase() + r.slice(1)}
                  </label>
                ))}
              </div>
            </div>
          </section>
          {canEdit && (
            <div>
              <Submit>Save security policy</Submit>
            </div>
          )}
        </fieldset>
      )}
    </ActionForm>
  );
}
