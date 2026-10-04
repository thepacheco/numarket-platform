"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import SolidIcon from "./solids/SolidIcon";
import type { NavSection } from "@/lib/nav";

/* The left navigation, modeled on enterprise consoles like Snowflake's:
   each product is a section headed by its shape and color from the
   marketing site, with plain sub-items. Collapses to an icon rail. */
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
  const isCurrent = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

  return (
    <nav ref={nav} className={`rail ${collapsed ? "collapsed" : ""}`} aria-label="Workspace">
      <button type="button" className="rail-close" onClick={closeMenu}>
        <Icon name="x" /> Close menu
      </button>
      <Link href="/" className="rail-top" aria-current={isCurrent("/") ? "page" : undefined} title="Home">
        <Icon name="home" />
        <span className="rail-label">Home</span>
      </Link>

      {sections.map((s) => {
        const open = s.items.some((i) => isCurrent(i.href));
        if (collapsed)
          return (
            <Link key={s.product} href={s.items[0].href} className={`rail-icon ${open ? "on" : ""} ${s.owned ? "" : "unowned"}`} title={s.owned ? s.name : `${s.name} · not in your plan`}>
              <SolidIcon kind={s.product} size={24} muted={!s.owned} />
            </Link>
          );
        return (
          <details key={s.product} className={`rail-sec p-${s.product} ${s.owned ? "" : "unowned"}`} open={s.owned}>
            <summary className="rail-h">
              <SolidIcon kind={s.product} size={22} muted={!s.owned} />
              <span className="rail-label">{s.name}</span>
              {!s.owned && <span className="rail-lock">Not in plan</span>}
              <Icon name="chevron" className="rail-chev" />
            </summary>
            <ul>
              {s.items.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} className={`rail-link ${i.locked ? "locked" : ""}`} aria-current={isCurrent(i.href) ? "page" : undefined}>
                    <span>{i.label}</span>
                    {i.badge === "flags" && flags > 0 ? <span className="nav-count">{flags}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        );
      })}

      <div className="rail-foot">
        {settings && (
          <Link href="/admin" className="rail-top" aria-current={path.startsWith("/admin") ? "page" : undefined} title="Settings">
            <Icon name="gear" />
            <span className="rail-label">Settings</span>
          </Link>
        )}
        <button type="button" className="rail-top rail-toggle" onClick={toggle} aria-label={collapsed ? "Expand menu" : "Collapse menu"} title={collapsed ? "Expand menu" : "Collapse menu"}>
          <Icon name={collapsed ? "expand" : "collapse"} />
          <span className="rail-label">Collapse menu</span>
        </button>
        <span className="rail-powered rail-label">Powered by numarket</span>
      </div>
    </nav>
  );
}
