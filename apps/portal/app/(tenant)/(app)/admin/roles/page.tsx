import type { Metadata } from "next";
import { can, PERMISSION_GROUPS, ROLES } from "@numarket/auth";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Roles" };

const LABEL: Record<string, string> = {
  "dashboard.view": "View dashboards", "dashboard.export": "Export data", "report.view": "View reports", "report.edit": "Edit report commentary",
  "report.publish": "Publish reports", "report.schedule": "Schedule reports", "input.submit": "Enter data", "input.edit_own": "Edit own entries",
  "input.edit_any": "Edit anyone's entries", "input.approve": "Approve entries", "alert.manage_own": "Manage own alerts", "alert.manage_all": "Manage all alerts",
  "ask.use": "Ask Your Data", "definitions.view": "View definitions", "definitions.suggest": "Suggest definition changes", "flags.view": "View flags and data health",
  "flags.resolve": "Settle flags", "sources.view": "View sources", "sources.connect": "Connect sources", "refresh.trigger": "Update now",
  "actions.view": "View action items", "actions.update_own": "Update own action items", "actions.manage": "Manage action items", "users.manage": "Manage users",
  "roles.manage": "Manage roles", "branding.manage": "Change branding", "security.manage": "Change the security policy", "audit.view": "View the audit log", "usage.view": "View usage and plan",
};

export default async function Roles() {
  await requireTenant("users.manage");
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Roles</h1>
          <p>Every person has one role. Custom roles are available on the Operate and Command plans.</p>
        </div>
      </div>
      <div className="grid-3" style={{ marginBottom: 16, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        {ROLES.map((r) => (
          <div key={r.id} className="card">
            <h3>{r.name}</h3>
            <p className="small muted" style={{ margin: 0 }}>
              {r.summary}
            </p>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th scope="col">Permission</th>
                {ROLES.map((r) => (
                  <th key={r.id} scope="col" style={{ textAlign: "center" }}>
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.flatMap((g) => [
                <tr key={g.name}>
                  <td colSpan={ROLES.length + 1} style={{ background: "var(--surface-2)", fontWeight: 700, fontSize: 12.5 }}>
                    {g.name}
                  </td>
                </tr>,
                ...g.keys.map((k) => (
                  <tr key={k}>
                    <td>{LABEL[k] ?? k}</td>
                    {ROLES.map((r) => (
                      <td key={r.id} style={{ textAlign: "center" }} aria-label={can(r.id, k) ? "Yes" : "No"}>
                        {can(r.id, k) ? <span style={{ color: "var(--good)", fontWeight: 700 }}>✓</span> : <span className="muted">—</span>}
                      </td>
                    ))}
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
