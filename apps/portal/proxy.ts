import { NextResponse, type NextRequest } from "next/server";
import { hostConfigFromEnv, surfaceForHost } from "@numarket/auth/hosts";

/* Routes each request to its surface by host, and sets a per-request
   Content Security Policy with a nonce.

   - Ops hosts (OPS_HOSTS) are served from app/ops.
   - Every other host is a tenant host; the tenant itself is resolved by the
     data-access layer on each page and action (never trusted from headers).
   - /ops on a tenant host does not exist. */

const cfg = hostConfigFromEnv();

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const surface = surfaceForHost(host, cfg);
  const url = request.nextUrl.clone();
  const path = url.pathname;

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const headers = new Headers(request.headers);
  /* never let a client supply our internal headers */
  for (const k of [...headers.keys()]) if (k.startsWith("x-nm-")) headers.delete(k);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);

  let res: NextResponse;
  if (surface.surface === "ops") {
    url.pathname = path === "/" ? "/ops" : path.startsWith("/ops") ? path : `/ops${path}`;
    res = NextResponse.rewrite(url, { request: { headers } });
  } else if (path === "/ops" || path.startsWith("/ops/")) {
    url.pathname = "/not-found";
    res = NextResponse.rewrite(url, { request: { headers } });
  } else {
    res = NextResponse.next({ request: { headers } });
  }
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/cron).*)"],
};
