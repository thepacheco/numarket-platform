import { devSignInEnabled, authProviderStatus } from "@numarket/auth";

/* rendered per request so the Content Security Policy nonce applies */
export const dynamic = "force-dynamic";

/* numarket staff sign in with SSO + MFA through the auth provider (Spec §4.4).
   Until it's connected, only local development has a way in. */
export default function OpsSignIn() {
  const dev = devSignInEnabled();
  const provider = authProviderStatus();
  return (
    <main className="signin">
      <div className="signin-card" style={{ maxWidth: 480 }}>
        <p className="eyebrow">numarket staff only</p>
        <h1 style={{ fontSize: 26, margin: "8px 0" }}>Ops console</h1>
        {dev ? (
          <form action="/ops/sign-in/dev" method="post" className="stack">
            <div className="field">
              <label htmlFor="email">Development sign-in (local only)</label>
              <input id="email" name="email" type="email" className="input" defaultValue="ops@numarket.us" required />
            </div>
            <button type="submit" className="btn btn-primary">
              Sign in
            </button>
          </form>
        ) : (
          <p className="muted">
            {provider.configured ? "Staff sign-in is being connected." : "Staff sign-in opens once the sign-in provider (SSO with a passkey or hardware key) is connected."}
          </p>
        )}
      </div>
    </main>
  );
}
