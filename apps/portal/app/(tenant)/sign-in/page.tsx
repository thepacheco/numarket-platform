import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { authProviderStatus, demoPersonas, devSignInEnabled } from "@numarket/auth";
import { withTenant } from "@numarket/db";
import { getBranding } from "@numarket/db/repo/admin";
import { latestSnapshot } from "@numarket/db/repo/snapshots";
import { brandVars } from "@numarket/ui";
import { tenantForRequest } from "@/lib/guard";
import { ROLE_LABEL } from "@/lib/nav";

export const metadata: Metadata = { title: "Sign in" };

const personaBlurb: Record<string, string> = {
  owner: "Sees every job, every report, and the admin settings.",
  pm: "Sees only Route 9 Bridge. Enters data, edits and publishes reports.",
  field: "Fills in the daily field report from the job site. Nothing else.",
  viewer: "Reads every dashboard and report. Changes nothing.",
};

/* Public page: the tenant comes from the host. Shows only the sign-in methods
   this tenant allows. */
export default async function SignIn({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const tenant = await tenantForRequest();
  if (!tenant) notFound();
  const { error } = await searchParams;
  const { branding, jobs } = await withTenant(tenant.id, async (db) => {
    const b = await getBranding(db);
    const snap = tenant.isDemo ? await latestSnapshot(db) : null;
    const jobs = Object.fromEntries((snap?.datasets.job_summary ?? []).map((r) => [String(r.job), String(r.name)]));
    return { branding: b, jobs };
  });
  const personas = await demoPersonas(tenant);
  const provider = authProviderStatus();

  return (
    <main className="signin" style={brandVars(branding?.primary_color ?? "#22577A", branding?.accent_color ?? "#38A3A5")}>
      <div className="signin-card">
        <div className="row" style={{ gap: 12 }}>
          <span className="logo-chip">{branding?.logo_text ?? tenant.name.slice(0, 2)}</span>
          <div>
            <p className="eyebrow">{tenant.isDemo ? "Demo workspace" : "Sign in"}</p>
            <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.2 }}>{branding?.display_name ?? tenant.name}</h1>
          </div>
        </div>
        {branding?.signin_message && <p className="muted" style={{ marginTop: 14 }}>{branding.signin_message}</p>}
        {error && <p className="notice risk" style={{ marginTop: 12 }}>That sign-in didn&apos;t work. Please try again.</p>}

        {tenant.isDemo ? (
          <div className="persona-grid">
            {personas.map((p) => (
              <form action="/sign-in/demo" method="post" key={p.persona}>
                <input type="hidden" name="persona" value={p.persona} />
                <button type="submit" className="persona">
                  <b>{p.name}</b>
                  <span className="small muted">{p.title}</span>
                  <span className="row" style={{ gap: 6 }}>
                    <span className="pill brand">{ROLE_LABEL[p.role]}</span>
                    <span className="pill">{p.scopeValues ? p.scopeValues.map((v) => jobs[v] ?? v).join(", ") : "All jobs"}</span>
                  </span>
                  <span className="small">{personaBlurb[p.persona] ?? ""}</span>
                </button>
              </form>
            ))}
          </div>
        ) : (
          <div className="stack" style={{ marginTop: 18 }}>
            <button className="btn btn-secondary" disabled aria-disabled="true">
              Continue with Microsoft
            </button>
            <button className="btn btn-secondary" disabled aria-disabled="true">
              Continue with Google
            </button>
            {!provider.configured && <p className="small muted">Sign-in opens once the workspace&apos;s sign-in provider is connected.</p>}
          </div>
        )}

        {devSignInEnabled() && !tenant.isDemo && (
          <form action="/sign-in/dev" method="post" className="stack">
            <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "18px 0 4px" }} />
            <div className="field">
              <label htmlFor="email">Development sign-in (local only)</label>
              <input id="email" name="email" type="email" className="input" placeholder="owner@acme.example" required />
            </div>
            <button type="submit" className="btn btn-primary">
              Sign in
            </button>
          </form>
        )}
        <p className="small muted" style={{ marginTop: 20 }}>Powered by numarket</p>
      </div>
    </main>
  );
}
