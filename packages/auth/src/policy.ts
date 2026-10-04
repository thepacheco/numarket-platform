/* The tenant security policy (Platform Build Spec §4.3), enforced by the Portal
   on every request, not only at sign-in. */

export type SignInMethod = "demo" | "dev" | "microsoft" | "google" | "password" | "sso";

export type SecurityPolicy = {
  allowedMethods: SignInMethod[];
  requireMfa: boolean;
  allowedEmailDomains: string[];
  ipAllowlist: string[];
  sessionHours: number;
  idleMinutes: number;
  exportRoles: string[];
  requireApproval: boolean;
};

export type PolicySession = { method: SignInMethod; mfa: boolean; createdAt: Date; lastSeenAt: Date };

export type PolicyResult = { ok: true } | { ok: false; reason: "method" | "mfa" | "network" | "expired" | "idle" };

export function evaluatePolicy(policy: SecurityPolicy, session: PolicySession, ip: string | null, now = new Date()): PolicyResult {
  /* Dev sign-in is a local-only tool and is never allowed in production. */
  if (session.method === "dev") {
    if (process.env.NODE_ENV === "production") return { ok: false, reason: "method" };
  } else if (!policy.allowedMethods.includes(session.method)) {
    return { ok: false, reason: "method" };
  }
  /* For Microsoft, Google, and enterprise SSO the second factor is enforced by
     the client's identity provider. For email + password we require it here. */
  if (policy.requireMfa && session.method === "password" && !session.mfa) return { ok: false, reason: "mfa" };
  if (now.getTime() - session.createdAt.getTime() > policy.sessionHours * 3600_000) return { ok: false, reason: "expired" };
  if (now.getTime() - session.lastSeenAt.getTime() > policy.idleMinutes * 60_000) return { ok: false, reason: "idle" };
  if (policy.ipAllowlist.length && !ipAllowed(ip, policy.ipAllowlist)) return { ok: false, reason: "network" };
  return { ok: true };
}

export const POLICY_REASONS: Record<Exclude<PolicyResult, { ok: true }>["reason"], string> = {
  method: "This workspace doesn't allow that sign-in method. Sign in with one your administrator has enabled.",
  mfa: "This workspace requires a second sign-in step. Set up an authenticator app or passkey to continue.",
  network: "This workspace only allows access from your company's network or VPN. Connect to it and try again.",
  expired: "Your session ended. Please sign in again.",
  idle: "You were signed out after a period of inactivity. Please sign in again.",
};

/* ---------- IP allowlists (IPv4 and IPv6 CIDR) ---------- */

function parseIp(ip: string): { v: 4 | 6; n: bigint } | null {
  const s = ip.trim().replace(/^\[|\]$/g, "");
  const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return parseIp(mapped[1]);
  if (/^\d+\.\d+\.\d+\.\d+$/.test(s)) {
    const parts = s.split(".").map(Number);
    if (parts.some((p) => p > 255)) return null;
    return { v: 4, n: parts.reduce((a, p) => (a << 8n) + BigInt(p), 0n) };
  }
  if (!s.includes(":")) return null;
  const [head, tail] = s.split("::");
  if (s.split("::").length > 2) return null;
  const h = head ? head.split(":") : [];
  const t = tail !== undefined && tail ? tail.split(":") : [];
  const fill = tail === undefined ? 0 : 8 - h.length - t.length;
  const groups = [...h, ...Array(fill).fill("0"), ...t];
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/i.test(g))) return null;
  return { v: 6, n: groups.reduce((a, g) => (a << 16n) + BigInt(parseInt(g, 16)), 0n) };
}

export function isValidCidr(cidr: string): boolean {
  const [addr, bits] = cidr.trim().split("/");
  const p = parseIp(addr ?? "");
  if (!p) return false;
  if (bits === undefined) return true;
  const b = Number(bits);
  return Number.isInteger(b) && b >= 0 && b <= (p.v === 4 ? 32 : 128);
}

export function ipInCidr(ip: string, cidr: string): boolean {
  const [addr, bitsStr] = cidr.trim().split("/");
  const a = parseIp(ip);
  const net = parseIp(addr ?? "");
  if (!a || !net || a.v !== net.v) return false;
  const width = a.v === 4 ? 32 : 128;
  const bits = bitsStr === undefined ? width : Number(bitsStr);
  if (!Number.isInteger(bits) || bits < 0 || bits > width) return false;
  const shift = BigInt(width - bits);
  return a.n >> shift === net.n >> shift;
}

export function ipAllowed(ip: string | null, allowlist: string[]): boolean {
  if (!ip) return false;
  return allowlist.some((c) => ipInCidr(ip, c));
}
