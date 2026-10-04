/* Which surface a request's host belongs to (isolation layer 1).

   Ops console: hosts listed in OPS_HOSTS (e.g. ops.numarket.us).
   Tenant app:  a host in the tenant_hosts table (single-tenant host such as
                app.numarket.us), or {slug}.<APP_DOMAIN> once the wildcard
                app domain exists. */

export const RESERVED_SUBDOMAINS = new Set([
  "www", "app", "ops", "admin", "auth", "api", "demo", "status", "mail", "docs", "help",
  "support", "billing", "static", "cdn", "numarket", "test", "staging",
]);

export type HostConfig = { opsHosts: string[]; appDomain: string | null };

export function hostConfigFromEnv(env: Record<string, string | undefined> = process.env): HostConfig {
  return {
    opsHosts: (env.OPS_HOSTS ?? "").split(",").map((h) => normalizeHost(h)).filter(Boolean),
    appDomain: env.APP_DOMAIN ? normalizeHost(env.APP_DOMAIN) : null,
  };
}

export function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").trim().toLowerCase().replace(/\.$/, "");
}

export type Surface = { surface: "ops" } | { surface: "tenant"; host: string };

export function surfaceForHost(host: string, cfg: HostConfig): Surface {
  const h = normalizeHost(host);
  if (cfg.opsHosts.includes(h)) return { surface: "ops" };
  return { surface: "tenant", host: h };
}

/** The tenant slug implied by a wildcard subdomain, or null. "demo" and other
 *  reserved names are never assignable by subdomain; they are mapped only
 *  through tenant_hosts by numarket. */
export function slugFromSubdomain(host: string, cfg: HostConfig): string | null {
  if (!cfg.appDomain) return null;
  const h = normalizeHost(host);
  const suffix = "." + cfg.appDomain;
  if (!h.endsWith(suffix)) return null;
  const sub = h.slice(0, -suffix.length);
  if (!sub || sub.includes(".") || RESERVED_SUBDOMAINS.has(sub)) return null;
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(sub)) return null;
  return sub;
}
