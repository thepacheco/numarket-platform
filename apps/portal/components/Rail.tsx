"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import SolidIcon from "./solids/SolidIcon";
import type { NavItem, NavSection } from "@/lib/nav";

/* The left navigation: Home, then each product with one or two entries
   (each opens a hub with tabs), Settings at the bottom. Products are marked
   with their shape and color from the marketing site. The desktop rail
   collapses to icons; on phones it opens full screen. */
export default function Rail({ sections, flags, settings, mobile = false }: { sections: NavSection[]; flags: number; settings: boolean; mobile?: boolean }) {
  const path = usePathname();
  const [saved, setCollapsed] = useState(false);
  /* the phone menu is always full width; only the desktop rail collapses */
  const collapsed = saved && !mobile;
  const nav = useRef<HTMLElement>(null);
  /* on phones the rail sits inside a menu; close it after each navigation */
  const closeMenu = () => {
    const d = nav.current?.closest("details");
    if (d) d.open = false;
  };
  useEffect(closeMenu, [path]);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("nm-rail") === "collapsed");
    } catch {}
  }, []);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("nm-rail", next ? "collapsed" : "open");
    } catch {}
  };
  const on = (prefixes: string[]) => prefixes.some((p) => (p === "/" ? path === "/" : path === p || path.startsWith(p + "/")));
  const current = (i: NavItem) => on(i.match ?? [i.href]);

  return (
    <nav ref={nav} className={`rail ${collapsed ? "collapsed" : ""}`} aria-label="Workspace">
      <button type="button" className="rail-close" onClick={closeMenu}>
        <Icon name="x" /> Close menu
      </button>
      <Link href="/" className="rail2-home" aria-current={path === "/" || path.startsWith("/home") ? "page" : undefined} data-tip-title="Home" data-tip="Your own page: the numbers, charts, and to-dos you care about most. Customize it any time.">
        <Icon name="home" />
        <span>Home</span>
      </Link>

      {sections.map((s) => (
        <div key={s.product} className={`rail2-sec p-${s.product} ${s.owned ? "" : "unowned"}`}>
          <div className="rail2-h" data-tip-title={`${s.name}: ${s.tagline}`} data-tip={s.owned ? s.about : `Not in your plan. ${s.about}`}>
            <SolidIcon kind={s.product} size={16} muted={!s.owned} />
            <span>{s.name}</span>
            {!s.owned && <span className="rail-lock">Not in plan</span>}
          </div>
          <ul>
            {s.items.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className={`rail2-link ${i.locked ? "locked" : ""}`} aria-current={current(i) ? "page" : undefined} data-tip-title={collapsed ? `${s.name} · ${i.label}` : i.label} data-tip={i.tip ?? i.label}>
                  <Icon name={i.icon} />
                  <span>{i.label}</span>
                  {i.badge === "flags" && flags > 0 ? <span className="nav-count">{flags}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="rail-foot">
        {settings && (
          <Link href="/admin" className="rail2-home" aria-current={path.startsWith("/admin") ? "page" : undefined} data-tip-title="Settings" data-tip="Users and roles, branding, security, the audit log, and usage and plan.">
            <Icon name="gear" />
            <span>Settings</span>
          </Link>
        )}
        <button type="button" className="rail2-home rail-toggle" onClick={toggle} aria-label={collapsed ? "Expand menu" : "Collapse menu"} title={collapsed ? "Expand menu" : "Collapse menu"}>
          <Icon name={collapsed ? "expand" : "collapse"} />
          <span>Collapse menu</span>
        </button>
        <span className="rail-powered rail-label">Powered by numarket</span>
      </div>
    </nav>
  );
}
