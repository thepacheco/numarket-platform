import type { Metadata } from "next";
import Link from "next/link";
import { withTenant } from "@numarket/db";
import { listScreens } from "@numarket/db/repo/workspace";
import PendingNote from "@/components/PendingNote";
import { workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Input screens" };

export default async function Inputs() {
  const ctx = await requireTenant("input.submit");
  const ws = await workspace(ctx);
  const screens = await withTenant(ctx.tenant.id, listScreens);
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Input screens</h1>
          <p>Enter it once, in one place. These replace the spreadsheets and paper forms that used to be emailed around.</p>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <PendingNote ctx={ctx} pending={ws.pending} nextUpdate={ws.nextUpdate} />
      </div>
      <ul className="list">
        {screens.map((s) => (
          <li key={s.slug}>
            <Link href={`/inputs/${s.slug}`} className="item">
              <h3>{s.title}</h3>
              <p className="small muted" style={{ margin: "4px 0 0" }}>
                {s.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
