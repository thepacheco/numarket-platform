import type { Metadata } from "next";
import { withTenant } from "@numarket/db";
import { getPolicy } from "@numarket/db/repo/admin";
import DemoLock from "@/components/DemoLock";
import PolicyForm from "@/components/PolicyForm";
import { requireTenant } from "@/lib/guard";
import { requestMeta } from "@/lib/request";
import { savePolicy } from "../../../actions";

export const metadata: Metadata = { title: "Security" };


/* The tenant security policy (Spec §4.3). Admins can view it; only Owners
   change it. It's enforced on every request, not just at sign-in. */
export default async function Security() {
  const ctx = await requireTenant("users.manage");
  const p = await withTenant(ctx.tenant.id, getPolicy);
  const { ip } = await requestMeta();
  const canEdit = ctx.can("security.manage") && !ctx.tenant.isDemo;
  if (!p) return null;
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Security</h1>
          <p>How people sign in, from where, and for how long. Checked on every request.</p>
        </div>
      </div>
      {ctx.tenant.isDemo ? <DemoLock /> : !ctx.can("security.manage") && <p className="notice" style={{ marginBottom: 16 }}>Only an Owner can change the security policy.</p>}
      <PolicyForm action={savePolicy} policy={p} canEdit={canEdit} isDemo={ctx.tenant.isDemo} ip={ip} />
    </>
  );
}
