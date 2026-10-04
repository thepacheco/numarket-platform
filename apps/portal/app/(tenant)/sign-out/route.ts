import { cookieOptions, revokeSession, SESSION_COOKIE } from "@numarket/auth";
import { sameOrigin, seeOther, serializeCookie as serialize } from "@/lib/request";

/* Sign out: end the session on the server, clear the cookie, go to sign-in.
   A plain POST (not a Server Action) so the redirect stays on this host. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response("Forbidden", { status: 403 });
  const token = req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(SESSION_COOKIE.tenant + "="))?.split("=")[1];
  await revokeSession(token);
  const res = seeOther(req, "/sign-in");
  res.headers.append("set-cookie", serialize(SESSION_COOKIE.tenant, "", cookieOptions(0)));
  return res;
}
