import { createHash, randomBytes } from "node:crypto";
import { withPlatform, type Db } from "@numarket/db";
import type { SignInMethod } from "./policy";

/* Server-side sessions. The browser holds a random 256-bit token in a
   __Host- cookie (Secure, HttpOnly, Path=/, SameSite=Lax, no Domain), so it is
   bound to the exact host that set it. Only the token's SHA-256 is stored. */

export const SESSION_COOKIE = {
  tenant: process.env.NODE_ENV === "production" ? "__Host-nm_session" : "nm_session",
  ops: process.env.NODE_ENV === "production" ? "__Host-nm_ops" : "nm_ops",
};

export function cookieOptions(maxAgeSeconds: number) {
  const prod = process.env.NODE_ENV === "production";
  return { httpOnly: true, secure: prod, sameSite: "lax" as const, path: "/", maxAge: maxAgeSeconds };
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type SessionRow = {
  id_hash: string;
  user_id: string;
  surface: "tenant" | "ops";
  tenant_id: string | null;
  method: SignInMethod;
  mfa: boolean;
  created_at: Date;
  last_seen_at: Date;
  expires_at: Date;
};

export async function createSession(
  db: Db,
  s: { userId: string; surface: "tenant" | "ops"; tenantId: string | null; method: SignInMethod; mfa: boolean; hours: number; ip: string | null; userAgent: string | null },
) {
  const token = randomBytes(32).toString("base64url");
  await db.query(
    `insert into sessions (id_hash, user_id, surface, tenant_id, method, mfa, ip, user_agent, expires_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now() + make_interval(hours => $9))`,
    [hashToken(token), s.userId, s.surface, s.tenantId, s.method, s.mfa, s.ip, s.userAgent?.slice(0, 300) ?? null, s.hours],
  );
  return { token, maxAge: s.hours * 3600 };
}

export async function findSession(token: string | null | undefined, surface: "tenant" | "ops"): Promise<SessionRow | null> {
  if (!token || token.length < 32 || token.length > 64) return null;
  return withPlatform(async (db) => {
    const r = await db.query<SessionRow>(
      `select id_hash, user_id, surface, tenant_id, method, mfa, created_at, last_seen_at, expires_at
       from sessions where id_hash = $1 and surface = $2 and revoked_at is null and expires_at > now()`,
      [hashToken(token), surface],
    );
    return r.rows[0] ?? null;
  });
}

/* Keep last_seen fresh for the idle timeout, at most once a minute. */
export async function touchSession(idHash: string, lastSeen: Date) {
  if (Date.now() - lastSeen.getTime() < 60_000) return;
  await withPlatform((db) => db.query("update sessions set last_seen_at = now() where id_hash = $1", [idHash]));
}

export async function revokeSession(token: string | null | undefined) {
  if (!token) return;
  await withPlatform((db) => db.query("update sessions set revoked_at = now() where id_hash = $1 and revoked_at is null", [hashToken(token)]));
}
