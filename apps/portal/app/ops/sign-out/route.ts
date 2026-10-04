import { cookieOptions, revokeSession, SESSION_COOKIE } from "@numarket/auth";
import { sameOrigin, seeOther, serializeCookie as serialize } from "@/lib/request";

/* Staff sign-out, the same way as the tenant one. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response("Forbidden", { status: 403 });
  const token = req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(SESSION_COOKIE.ops + "="))?.split("=")[1];
  await revokeSession(token);
  const res = seeOther(req, "/sign-in");
  res.headers.append("set-cookie", serialize(SESSION_COOKIE.ops, "", cookieOptions(0)));
  return res;
}
