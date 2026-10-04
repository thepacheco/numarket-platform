import "server-only";
import { cookies, headers } from "next/headers";
import { hostConfigFromEnv, normalizeHost } from "@numarket/auth/hosts";

/* Facts about the incoming request, read the same way everywhere. */

export const hostCfg = hostConfigFromEnv();

export async function requestMeta() {
  const h = await headers();
  const host = normalizeHost(h.get("host"));
  /* On Vercel, x-real-ip / the first x-forwarded-for entry is the client. */
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  return { host, ip, userAgent: h.get("user-agent"), nonce: h.get("x-nonce") ?? undefined };
}

export async function cookieValue(name: string) {
  return (await cookies()).get(name)?.value;
}

/** CSRF check for state-changing route handlers (Spec §1): the browser's
 *  Origin must be this exact host. */
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = normalizeHost(req.headers.get("host"));
  if (!origin || !host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host;
  } catch {
    return false;
  }
}

export function clientMeta(req: Request) {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  return { host: normalizeHost(req.headers.get("host")), ip, userAgent: req.headers.get("user-agent") };
}

/** A redirect to a path on the request's own host. */
export function seeOther(req: Request, path: string) {
  const proto = req.headers.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return new Response(null, { status: 303, headers: { location: `${proto}://${normalizeHost(req.headers.get("host"))}${path}`, "cache-control": "no-store" } });
}

export function serializeCookie(name: string, value: string, o: { path: string; maxAge: number; secure: boolean }) {
  return [`${name}=${value}`, `Path=${o.path}`, `Max-Age=${o.maxAge}`, "HttpOnly", "SameSite=Lax", o.secure ? "Secure" : ""].filter(Boolean).join("; ");
}
