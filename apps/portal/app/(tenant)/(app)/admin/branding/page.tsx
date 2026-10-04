import type { Metadata } from "next";
import { withTenant } from "@numarket/db";
import { getBranding } from "@numarket/db/repo/admin";
import BrandingForm from "@/components/BrandingForm";
import DemoLock from "@/components/DemoLock";
import { requireTenant } from "@/lib/guard";
import { saveBranding } from "../../../actions";

export const metadata: Metadata = { title: "Branding" };

export default async function Branding() {
  const ctx = await requireTenant("branding.manage");
  const b = await withTenant(ctx.tenant.id, getBranding);
  if (!b) return null;
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Branding</h1>
          <p>Your name, colors, and report footer across the Portal, reports, and emails.</p>
        </div>
      </div>
      {ctx.tenant.isDemo && <DemoLock />}
      <BrandingForm action={saveBranding} initial={b} locked={ctx.tenant.isDemo} />
    </>
  );
}
