import Link from "next/link";
import { brandVars } from "@numarket/ui";
import Icon from "@/components/Icon";
import NavLink from "@/components/NavLink";
import { requireTenant } from "@/lib/guard";
import { fmtDateTime, jobsInScope, workspace } from "@/lib/data";
import { navFor, ROLE_LABEL, scopeLabel } from "@/lib/nav";
import { signOut } from "../actions";

/* The tenant app shell. It reads the session only to draw the navigation;
   each page and action still checks access itself (lib/guard.ts). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireTenant();
  const ws = await workspace(ctx);
  const b = ws.branding;
  const groups = navFor(ctx);
  const jobs = Object.fromEntries(jobsInScope(ws.snapshot?.datasets, { ...ctx, scope: null }).map((j) => [j.code, j.name]));
  const initials = ctx.user.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const updated = ws.snapshot ? fmtDateTime(ws.snapshot.published_at, ctx.tenant.timezone) : "not yet";

  const nav = (
    <nav className="side" aria-label="Workspace">
      <Link href="/" className="tenant-mark">
        <span className="logo-chip">{b?.logo_text ?? ctx.tenant.name.slice(0, 2).toUpperCase()}</span>
        <span>
          <b>{b?.display_name ?? ctx.tenant.name}</b>
          <span>{ctx.tenant.isDemo ? "Demo workspace" : "Workspace"}</span>
        </span>
      </Link>
      {groups.map((g) => (
        <div className="nav-group" key={g.name}>
          <p>{g.name}</p>
          <ul>
            {g.items.map((i) => (
              <li key={i.href}>
                <NavLink href={i.href} icon={i.icon} label={i.label} count={i.badge === "flags" ? ws.openFlags : undefined} />
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="powered">Powered by numarket</p>
    </nav>
  );

  return (
    <div className="shell" style={brandVars(b?.primary_color ?? "#22577A", b?.accent_color ?? "#38A3A5")}>
      {nav}
      <div className="main">
        {ctx.tenant.isDemo && (
          <div className="demo-strip" role="note">
            <span>
              <b>Demo workspace.</b> Fictional sample data that resets every night.
            </span>
            <span>
              Viewing as {ctx.user.name}, {ROLE_LABEL[ctx.role]} ({scopeLabel(ctx, jobs)}).
            </span>
            <Link href="/sign-in">Switch person</Link>
          </div>
        )}
        <header className="topbar">
          <details className="mobile-nav">
            <summary aria-label="Menu">
              <Icon name="menu" />
            </summary>
            {nav}
          </details>
          <div className="grow" />
          <span className="stamp" title="Dashboards and reports read the data published at this time.">
            <i aria-hidden="true" />
            <span className="stamp-text">Updated</span> {updated}
          </span>
          <details className="menu">
            <summary aria-label="Account menu">
              <span className="avatar">{initials}</span>
              <span className="stamp-text small">{ctx.user.name}</span>
            </summary>
            <div className="menu-pop">
              <div>
                <b>{ctx.user.name}</b>
                <div className="small muted">{ctx.user.title ?? ctx.user.email}</div>
              </div>
              <div className="row">
                <span className="pill brand">{ROLE_LABEL[ctx.role]}</span>
                <span className="pill">{scopeLabel(ctx, jobs)}</span>
              </div>
              {ctx.tenant.isDemo && (
                <Link href="/sign-in" className="btn btn-secondary btn-sm">
                  Switch person
                </Link>
              )}
              <form action={signOut}>
                <button type="submit" className="btn btn-ghost btn-sm" style={{ paddingLeft: 0 }}>
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </header>
        <main className="content" id="main">
          {children}
        </main>
      </div>
    </div>
  );
}
