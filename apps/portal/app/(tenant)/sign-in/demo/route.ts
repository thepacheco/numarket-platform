import { cookieOptions, revokeSession, SESSION_COOKIE, startDemoSession, tenantForHost } from "@numarket/auth";
import { clientMeta, hostCfg, sameOrigin, seeOther, serializeCookie as serialize } from "@/lib/request";

/* One-click demo sign-in. Public by design, but only on demo workspaces whose
   policy allows it, and only from a form on this same host. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response("Forbidden", { status: 403 });
  const meta = clientMeta(req);
  const tenant = await tenantForHost(meta.host, hostCfg);
  if (!tenant?.isDemo) return new Response("Not found", { status: 404 });
  const form = await req.formData();
  /* switching person ends the previous demo session */
  const prev = req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(SESSION_COOKIE.tenant + "="))?.split("=")[1];
  await revokeSession(prev);
  try {
    const { token, maxAge } = await startDemoSession(tenant, String(form.get("persona") ?? ""), meta);
    const res = seeOther(req, "/");
    res.headers.append("set-cookie", serialize(SESSION_COOKIE.tenant, token, cookieOptions(maxAge)));
    return res;
  } catch {
    return seeOther(req, "/sign-in?error=persona");
  }
}

