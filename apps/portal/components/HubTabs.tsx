import Link from "next/link";
import type { HubTab } from "@/lib/nav";

/* The tabs at the top of a hub (Your data, Reports, Your analyst). */
export default function HubTabs({ tabs, current, flags = 0, label }: { tabs: HubTab[]; current: string; flags?: number; label: string }) {
  if (tabs.length < 2) return null;
  return (
    <nav className="hubtabs" aria-label={label}>
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.href === current ? "page" : undefined}>
          {t.label}
          {t.badge === "flags" && flags > 0 ? <span className="nav-count">{flags}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
