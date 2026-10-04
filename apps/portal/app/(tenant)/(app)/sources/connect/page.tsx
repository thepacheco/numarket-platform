import type { Metadata } from "next";
import Link from "next/link";
import { withTenant } from "@numarket/db";
import { listSources } from "@numarket/db/repo/workspace";
import { CONNECTORS, TIER_ABOUT, TIER_LABEL } from "@/lib/connectors";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Connect a source" };

export default async function ConnectCatalog() {
  const ctx = await requireTenant("sources.view");
  const connected = new Set((await withTenant(ctx.tenant.id, listSources)).map((s) => s.provider));
  const cats = [...new Set(CONNECTORS.map((c) => c.category))];
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            <Link href="/sources">Sources</Link>
          </p>
          <h1>Connect a source</h1>
          <p>Bring in the tools you already use. Every connection is read-only: it copies your data into your private database on a schedule and can&apos;t change anything in the tool.</p>
        </div>
      </div>
      <div className="tier-key">
        {(["A", "B", "C"] as const).map((t) => (
          <span key={t}>
            <span className={`pill tier-${t}`}>{TIER_LABEL[t]}</span> {TIER_ABOUT[t]}
          </span>
        ))}
      </div>
      {cats.map((cat) => (
        <section key={cat} style={{ marginBottom: 22 }}>
          <h2 className="section-h">{cat}</h2>
          <div className="grid-3">
            {CONNECTORS.filter((c) => c.category === cat).map((c) => (
              <Link key={c.id} href={c.id === "upload" ? "/upload" : `/sources/connect/${c.id}`} className="item connector">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <h3>{c.name}</h3>
                  {connected.has(c.id) ? <span className="pill healthy">Connected</span> : <span className={`pill tier-${c.tier}`}>{TIER_LABEL[c.tier]}</span>}
                </div>
                <p className="small muted" style={{ margin: "6px 0 0" }}>
                  {c.streams.join(", ")}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
