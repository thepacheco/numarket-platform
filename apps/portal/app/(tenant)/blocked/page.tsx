import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { POLICY_REASONS } from "@numarket/auth";
import { tenantForRequest } from "@/lib/guard";
import { requestMeta } from "@/lib/request";
import { signOut } from "../actions";

export const metadata: Metadata = { title: "Access blocked" };

/* Shown when the tenant's security policy refuses a request (Spec §12.1). */
export default async function Blocked({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const tenant = await tenantForRequest();
  if (!tenant) notFound();
  const { reason } = await searchParams;
  const text = POLICY_REASONS[reason as keyof typeof POLICY_REASONS] ?? "Your access to this workspace is blocked right now.";
  const { ip } = await requestMeta();
  return (
    <main className="signin">
      <div className="signin-card" style={{ maxWidth: 560 }}>
        <p className="eyebrow">{tenant.name}</p>
        <h1 style={{ fontSize: 26, margin: "8px 0" }}>You can&apos;t get in right now.</h1>
        <p>{text}</p>
        {reason === "network" && <p className="small muted">Your address: {ip ?? "unknown"}. Your administrator can add your network to the allowed list.</p>}
        <form action={signOut} style={{ marginTop: 16 }}>
          <button className="btn btn-secondary" type="submit">
            Sign in again
          </button>
        </form>
      </div>
    </main>
  );
}
