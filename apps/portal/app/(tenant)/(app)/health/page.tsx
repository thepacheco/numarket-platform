import type { Metadata } from "next";
import Link from "next/link";
import { withTenant } from "@numarket/db";
import { listChecks } from "@numarket/db/repo/workspace";
import { requireTenant } from "@/lib/guard";
import HubNav from "@/components/HubNav";

export const metadata: Metadata = { title: "Data health" };

const LABEL = { pass: "Passing", warn: "Needs a look", fail: "Failing" } as const;

export default async function Health() {
  const ctx = await requireTenant("flags.view");
  const checks = await withTenant(ctx.tenant.id, listChecks);
  const attention = checks.filter((c) => c.status !== "pass").length;
  return (
    <>
      <HubNav hub="data" current="/health" ctx={ctx} />
      <div className="page-head">
        <div>
          <p className="eyebrow">Your data</p>
          <h1>Data health</h1>
          <p>Checks run on every update, before anything reaches a dashboard.</p>
        </div>
      </div>
      <p className={`notice ${attention ? "warn" : "good"}`} style={{ marginBottom: 16 }}>
        {attention ? `${attention} of ${checks.length} checks need attention.` : `All ${checks.length} checks are passing.`} {attention > 0 && <Link href="/flags">See the flags</Link>}
      </p>
      <div className="card">
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th scope="col">Check</th>
                <th scope="col">Source</th>
                <th scope="col">Result</th>
                <th scope="col">Detail</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>{c.name}</b>
                  </td>
                  <td className="muted">{c.source}</td>
                  <td>
                    <span className={`pill ${c.status}`}>{LABEL[c.status]}</span>
                  </td>
                  <td>{c.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
