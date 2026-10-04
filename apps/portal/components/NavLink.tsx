"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

export default function NavLink({ href, icon, label, count, locked }: { href: string; icon: string; label: string; count?: number; locked?: boolean }) {
  const path = usePathname();
  const current = href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
  return (
    <Link href={href} className={`nav-link ${locked ? "locked" : ""}`} aria-current={current ? "page" : undefined}>
      <Icon name={icon} />
      <span>{label}</span>
      {count ? <span className="nav-count">{count}</span> : null}
    </Link>
  );
}
