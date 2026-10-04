import Link from "next/link";
import { brandVars } from "@numarket/ui";
import Icon from "@/components/Icon";
import NavLink from "@/components/NavLink";
import { requireTenant } from "@/lib/guard";
import { fmtDateTime, fmtTime, jobsInScope, workspace } from "@/lib/data";
import { canSeeSettings, navFor, ROLE_LABEL, scopeLabel } from "@/lib/nav";
import { signOut } from "../actions";

/* The tenant app shell. It reads the session only to draw the navigation;
   each page and action still checks access itself (lib/guard.ts). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireTenant();
  const ws = await workspace(ctx);
  const b = ws.branding;
  const sections = navFor(ctx);
  const jobs = Object.fromEntries(jobsInScope(ws.snapshot?.datasets, { ...ctx, scope: null }).map((j) => [j.code, j.name]));
  const initials = ctx.user.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const tz = ctx.tenant.timezone;
  const updated = ws.snapshot ? fmtDateTime(ws.snapshot.published_at, tz) : "not yet";

  const rail = (
    <nav className="rail" aria-label="Workspace">
      <ul className="rail-top">
        <li>
          <NavLink href="/" icon="home" label="Home" />
        </li>
      </ul>
      {sections.map((s) => (
        <div className={`rail-sec p-${s.product} ${s.owned ? "" : "unowned"}`} key={s.product}>
          <p className="rail-h">
            <i aria-hidden="true" />
            <span>{s.name}</span>
          </p>
          <ul>
            {s.items.map((i) => (
              <li key={i.href}>
                <NavLink href={i.href} icon={i.icon} label={i.label} locked={i.locked} count={i.badge === "flags" ? ws.openFlags : undefined} />
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="rail-foot">
        <span>Powered by numarket</span>
      </div>
    </nav>
  );

  return (
    <div className="app" style={brandVars(b?.primary_color ?? "#22577A", b?.accent_color ?? "#38A3A5")}>
      {ctx.tenant.isDemo && (
        <div className="demo-strip" role="note">
          <span>
            <b>Demo workspace</b> · fictional sample data, resets nightly
          </span>
          <span className="demo-who">
            Viewing as {ctx.user.name} · {ROLE_LABEL[ctx.role]} · {scopeLabel(ctx, jobs)}
          </span>
          <Link href="/sign-in">Switch person</Link>
        </div>
      )}
      <header className="appbar">
        <details className="mobile-nav">
          <summary aria-label="Menu">
            <Icon name="menu" />
          </summary>
          {rail}
        </details>
        <Link href="/" className="brand">
          <span className="logo-chip">{b?.logo_text ?? ctx.tenant.name.slice(0, 2).toUpperCase()}</span>
          <span className="brand-name">{b?.display_name ?? ctx.tenant.name}</span>
        </Link>
        <div className="grow" />
        <span className="stamp" title={`Dashboards and reports show data published ${updated}. Next scheduled update: ${fmtTime(ws.nextUpdate, tz)}.`}>
          <i aria-hidden="true" />
          <span className="stamp-text">Data updated</span> {updated}
        </span>
        {canSeeSettings(ctx) && (
          <Link href="/admin" className="icon-btn" aria-label="Settings" title="Settings">
            <Icon name="gear" />
          </Link>
        )}
        <details className="menu">
          <summary aria-label="Account menu">
            <span className="avatar">{initials}</span>
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
            <Link href="/home/customize" className="menu-link">
              Customize my Home page
            </Link>
            {ctx.tenant.isDemo && (
              <Link href="/sign-in" className="menu-link">
                Switch person
              </Link>
            )}
            <form action={signOut}>
              <button type="submit" className="menu-link">
                Sign out
              </button>
            </form>
          </div>
        </details>
      </header>
      <div className="frame">
        {rail}
        <main className="content" id="main">
          {children}
        </main>
      </div>
    </div>
  );
}
