"use server";

import { revalidatePath } from "next/cache";
import { tenantBySlug } from "@numarket/auth";
import { withTenant } from "@numarket/db";
import { audit } from "@numarket/db/repo/audit";
import { publishSimulated } from "@numarket/db/repo/snapshots";
import { resetDemoTenant } from "@numarket/db/provision";
import { ActionError, staffOrThrow } from "@/lib/guard";

export type ActionResult = { ok: boolean; message: string };

/* Staff actions on a tenant are written to that tenant's audit log, which the
   client can read (Spec §4.4). */
export async function opsResetDemo(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const { staff, meta } = await staffOrThrow(["platform_admin"]);
    const t = await tenantBySlug(String(form.get("slug") ?? ""));
    if (!t?.isDemo) throw new ActionError("Only demo workspaces can be reset.");
    await resetDemoTenant(t.id);
    await withTenant(t.id, (db) => audit(db, { tenantId: t.id, actorUserId: null, actorKind: "staff", action: "staff.reset_demo", target: staff.user.email, ip: meta.ip }));
    revalidatePath("/ops");
    return { ok: true, message: "Demo reset to its starting state." };
  } catch (e) {
    return { ok: false, message: e instanceof ActionError ? e.message : "Reset failed." };
  }
}

export async function opsPublish(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const { staff, meta } = await staffOrThrow(["platform_admin", "analyst", "engineer"]);
    const t = await tenantBySlug(String(form.get("slug") ?? ""));
    if (!t) throw new ActionError("No such tenant.");
    const r = await withTenant(t.id, async (db) => {
      const out = await publishSimulated(db, t, "manual", null);
      await audit(db, { tenantId: t.id, actorUserId: null, actorKind: "staff", action: "staff.publish", target: staff.user.email, detail: out, ip: meta.ip });
      return out;
    });
    revalidatePath(`/ops/tenants/${t.slug}`);
    return { ok: true, message: `Published version ${r.version} (${r.entriesApplied} entries applied).` };
  } catch (e) {
    return { ok: false, message: e instanceof ActionError ? e.message : (e as Error).message };
  }
}
