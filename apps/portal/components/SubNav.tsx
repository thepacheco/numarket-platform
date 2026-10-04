"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SubNav({ links, label }: { links: { href: string; label: string }[]; label: string }) {
  const path = usePathname();
  return (
    <nav className="subnav" aria-label={label}>
      {links.map((l) => (
        <Link key={l.href} href={l.href} aria-current={path === l.href ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
