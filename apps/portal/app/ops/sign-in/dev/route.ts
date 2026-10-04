import { cookieOptions, devSignInEnabled, SESSION_COOKIE, startDevStaffSession } from "@numarket/auth";
import { clientMeta, sameOrigin, seeOther, serializeCookie as serialize } from "@/lib/request";

/* Local development only. Staff sign in with SSO + MFA through the auth
   provider in every other environment. */
export async function POST(req: Request) {
  if (!devSignInEnabled() || !sameOrigin(req)) return new Response("Not found", { status: 404 });
  const form = await req.formData();
  try {
    const { token, maxAge } = await startDevStaffSession(String(form.get("email") ?? ""), clientMeta(req));
    const res = seeOther(req, "/ops");
    res.headers.append("set-cookie", serialize(SESSION_COOKIE.ops, token, cookieOptions(maxAge)));
    return res;
  } catch {
    return seeOther(req, "/ops/sign-in?error=1");
  }
}
