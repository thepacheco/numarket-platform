import { cookieOptions, SANDBOX_COOKIE, sandboxCodeOk, tenantForHost } from "@numarket/auth";
import { withTenant } from "@numarket/db";
import { audit } from "@numarket/db/repo/audit";
import { clientMeta, hostCfg, sameOrigin, seeOther, serializeCookie as serialize } from "@/lib/request";

/* A prospect enters their sandbox's access code. The code is kept in a cookie
   on this one address until the sandbox closes, so they can come back and
   pick a person again without retyping it. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response("Forbidden", { status: 403 });
  const meta = clientMeta(req);
  const tenant = await tenantForHost(meta.host, hostCfg);
  if (!tenant?.isDemo || !tenant.sandboxUntil) return new Response("Not found", { status: 404 });
  const code = String((await req.formData()).get("code") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const ok = await sandboxCodeOk(tenant.id, code);
  await withTenant(tenant.id, (db) => audit(db, { tenantId: tenant.id, actorUserId: null, actorKind: "demo", action: ok ? "sandbox.code_ok" : "sandbox.code_wrong", ip: meta.ip }));
  if (!ok) return seeOther(req, "/sign-in?error=code");
  const seconds = Math.max(60, Math.floor((tenant.sandboxUntil.getTime() - Date.now()) / 1000));
  const res = seeOther(req, "/sign-in");
  res.headers.append("set-cookie", serialize(SANDBOX_COOKIE, code, cookieOptions(seconds)));
  return res;
}
