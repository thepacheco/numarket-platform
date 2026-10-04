import type { Metadata } from "next";
import { withTenant } from "@numarket/db";
import { listMembers } from "@numarket/db/repo/admin";
import ActionForm, { Submit } from "@/components/ActionForm";
import DemoLock from "@/components/DemoLock";
import { ago, jobsInScope, workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { ROLE_LABEL } from "@/lib/nav";
import { updateMemberAction } from "../../../actions";

export const metadata: Metadata = { title: "Users" };

const METHOD: Record<string, string> = { demo: "Demo sign-in", dev: "Dev sign-in" };

export default async function Users() {
  const ctx = await requireTenant("users.manage");
  const ws = await workspace(ctx);
  const members = await withTenant(ctx.tenant.id, listMembers, { userId: ctx.user.id });
  const jobs = jobsInScope(ws.snapshot?.datasets, { ...ctx, scope: null });
  const jobName = Object.fromEntries(jobs.map((j) => [j.code, j.name]));
  const locked = ctx.tenant.isDemo;
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p>Who can sign in, what they can do (role), and which jobs they see (scope).</p>
        </div>
        <button className="btn btn-primary" disabled aria-disabled="true" title={locked ? "View-only in the demo" : "Invitations send once the sign-in provider is connected."}>
          Invite people
        </button>
      </div>
      {locked && <DemoLock />}
      <div className="card">
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th scope="col">Person</th>
                <th scope="col">Role</th>
                <th scope="col">Sees</th>
                <th scope="col">Status</th>
                <th scope="col">Last sign-in</th>
                <th scope="col">
                  <span className="sr-only">Change</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.user_id}>
                  <td>
                    <b>{m.name}</b>
                    <div className="small muted">{m.title ?? m.email}</div>
                  </td>
                  <td>
                    <span className="pill brand">{ROLE_LABEL[m.role]}</span>
                  </td>
                  <td className="small">{m.scope_values ? m.scope_values.map((v) => jobName[v] ?? v).join(", ") : "All jobs"}</td>
                  <td>
                    <span className={`pill ${m.status === "active" ? "good" : m.status}`}>{m.status === "active" ? "Active" : m.status === "invited" ? "Invited" : m.status}</span>
                  </td>
                  <td className="small muted">{m.last_sign_in_at ? ago(m.last_sign_in_at) : "Never"}</td>
                  <td>
                    <details>
                      <summary className="small" style={{ cursor: "pointer", color: "var(--brand-text)", fontWeight: 600 }}>
                        Change
                      </summary>
                      <ActionForm action={updateMemberAction} className="stack">
                        <fieldset disabled={locked} className="stack" style={{ border: 0, padding: 0, margin: "8px 0 0", minWidth: 220 }}>
                          <input type="hidden" name="user" value={m.user_id} />
                          <div className="field">
                            <label htmlFor={`r-${m.user_id}`}>Role</label>
                            <select id={`r-${m.user_id}`} name="role" className="input" defaultValue={m.role}>
                              {Object.entries(ROLE_LABEL).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <span className="label">Jobs they see</span>
                            {jobs.map((j) => (
                              <label key={j.code} className="check">
                                <input type="checkbox" name="scope" value={j.code} defaultChecked={m.scope_values?.includes(j.code)} /> {j.name}
                              </label>
                            ))}
                            <span className="help">Leave all unchecked for every job.</span>
                          </div>
                          <div>
                            <Submit className="btn btn-secondary btn-sm">Save</Submit>
                          </div>
                        </fieldset>
                      </ActionForm>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ margin: "12px 0 0" }}>
          {members.filter((m) => m.status === "active").length} active people. Sign-in method for this workspace: {ctx.policy.allowedMethods.map((x) => METHOD[x] ?? x).join(", ")}.
        </p>
      </div>
    </>
  );
}
