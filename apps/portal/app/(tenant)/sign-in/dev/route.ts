import { cookieOptions, devSignInEnabled, SESSION_COOKIE, startDevTenantSession, tenantForHost } from "@numarket/auth";
import { clientMeta, hostCfg, sameOrigin, seeOther, serializeCookie as serialize } from "@/lib/request";

/* Local development only (ALLOW_DEV_SIGNIN=1, never in production). */
export async function POST(req: Request) {
  if (!devSignInEnabled() || !sameOrigin(req)) return new Response("Not found", { status: 404 });
  const meta = clientMeta(req);
  const tenant = await tenantForHost(meta.host, hostCfg);
  if (!tenant) return new Response("Not found", { status: 404 });
  const form = await req.formData();
  try {
    const { token, maxAge } = await startDevTenantSession(tenant, String(form.get("email") ?? ""), meta);
    const res = seeOther(req, "/");
    res.headers.append("set-cookie", serialize(SESSION_COOKIE.tenant, token, cookieOptions(maxAge)));
    return res;
  } catch {
    return seeOther(req, "/sign-in?error=dev");
  }
}
