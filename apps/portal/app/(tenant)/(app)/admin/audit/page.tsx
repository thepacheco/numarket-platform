import type { Metadata } from "next";
import { withTenant } from "@numarket/db";
import { listAudit } from "@numarket/db/repo/audit";
import AutoSubmitSelect from "@/components/AutoSubmitSelect";
import { fmtDateTime } from "@/lib/data";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Audit log" };

const FILTERS = [
  ["", "Everything"],
  ["auth.", "Sign-ins"],
  ["input.", "Data entry"],
  ["refresh.", "Updates"],
  ["report.", "Reports"],
  ["flag.", "Flags"],
  ["export.", "Exports"],
  ["admin.", "Settings"],
  ["staff.", "numarket staff access"],
] as const;

const WHO: Record<string, string> = { system: "System", staff: "numarket staff" };

/* Append-only. Includes every numarket staff access (Spec §12.6). */
export default async function Audit({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const ctx = await requireTenant("audit.view");
  const { type } = await searchParams;
  const action = FILTERS.some(([k]) => k === type) ? type || undefined : undefined;
  const rows = await withTenant(ctx.tenant.id, (db) => listAudit(db, { action, limit: 200 }), { userId: ctx.user.id });
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Audit log</h1>
          <p>Who signed in, who changed what, and every time numarket staff looked at your workspace. Nothing here can be edited or deleted.</p>
        </div>
      </div>
      <form method="get" className="filters">
        <div className="field">
          <label htmlFor="type">Show</label>
          <AutoSubmitSelect id="type" name="type" className="input" defaultValue={type ?? ""}>
            {FILTERS.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </AutoSubmitSelect>
        </div>
      </form>
      <div className="card">
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Who</th>
                <th scope="col">What</th>
                <th scope="col">On</th>
                <th scope="col">From</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="small" style={{ whiteSpace: "nowrap" }}>
                    {fmtDateTime(r.at, ctx.tenant.timezone)}
                  </td>
                  <td>{r.actor_name ?? WHO[r.actor_kind] ?? "Someone"}</td>
                  <td>
                    <code className="small">{r.action}</code>
                  </td>
                  <td className="small">{r.target ?? ""}</td>
                  <td className="small muted">{r.ip ?? ""}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    Nothing yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
