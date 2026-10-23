import { timingSafeEqual } from "node:crypto";
import { withProvisioner } from "@numarket/db";
import { resetDemoTenant } from "@numarket/db/provision";
import { deleteExpiredSandboxes } from "@numarket/auth";

/* Nightly demo reset, called by Vercel Cron with Authorization: Bearer
   <CRON_SECRET>. Refuses everything else. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  if (!secret || got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) {
    return new Response("Unauthorized", { status: 401 });
  }
  /* the public demo is reset; prospect sandboxes keep their changes until they close */
  const ids = await withProvisioner(async (db) => (await db.query<{ id: string }>("select id from tenants where is_demo and sandbox_expires_at is null")).rows.map((r) => r.id));
  for (const id of ids) await resetDemoTenant(id);
  const closed = await deleteExpiredSandboxes();
  await withProvisioner((db) => db.query("delete from sessions where expires_at < now() - interval '1 day' or revoked_at < now() - interval '1 day'"));
  return Response.json({ reset: ids.length, sandboxesClosed: closed.length });
}
