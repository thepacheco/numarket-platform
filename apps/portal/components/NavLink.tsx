"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

export default function NavLink({ href, icon, label, count }: { href: string; icon: string; label: string; count?: number }) {
  const path = usePathname();
  const current = href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
  return (
    <Link href={href} className="nav-link" aria-current={current ? "page" : undefined}>
      <Icon name={icon} />
      {label}
      {count ? <span className="nav-count">{count}</span> : null}
    </Link>
  );
}
