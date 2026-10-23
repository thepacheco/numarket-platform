import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { withPlatform, withProvisioner } from "@numarket/db";
import { DEMO_OTHER_MEMBERS, DEMO_PERSONAS } from "@numarket/db/demo/config";
import { provisionSampleTenant } from "@numarket/db/provision";
import { RESERVED_SUBDOMAINS, normalizeHost } from "./hosts";

/* Prospect sandboxes. A sandbox is a private copy of the demo workspace for
   one prospect: their company name and colors on the same fictional sample
   data, at its own address, behind an access code. It keeps their changes
   until it closes; the nightly job deletes it after that. Created and removed
   by numarket staff (scripts/sandbox.ts, run from the GitHub "Sandbox"
   workflow); prospects can't create one. */

export const SANDBOX_MAX_DAYS = 30;
export const SANDBOX_MAX_ACTIVE = 25;
export const SANDBOX_COOKIE = process.env.NODE_ENV === "production" ? "__Host-nm_sbx" : "nm_sbx";

/* Unambiguous characters only (no 0/O, 1/I/L), so a code read over the phone works. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export function newSandboxCode() {
  const bytes = randomBytes(12);
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}
const normCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, "");
const hashCode = (c: string) => createHash("sha256").update(normCode(c)).digest("hex");

export function sandboxSlugFrom(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/, "");
}

/** Why a slug can't be used, or null if it can. */
export function sandboxSlugProblem(slug: string): string | null {
  if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(slug)) return "The short name must be 3–30 letters, numbers, or dashes.";
  if (RESERVED_SUBDOMAINS.has(slug) || slug === "acme") return `"${slug}" is reserved.`;
  return null;
}

export type SandboxInput = { name: string; slug?: string; days?: number; logoText?: string; color?: string; host?: string };
export type SandboxCreated = { slug: string; name: string; code: string; expiresAt: Date; hosts: string[] };

export async function createSandbox(input: SandboxInput, now = new Date()): Promise<SandboxCreated> {
  const name = input.name.trim().slice(0, 80);
  if (name.length < 2) throw new Error("Give the prospect's company name.");
  const slug = (input.slug?.trim().toLowerCase() || sandboxSlugFrom(name)).slice(0, 30);
  const problem = sandboxSlugProblem(slug);
  if (problem) throw new Error(problem);
  const days = Math.round(input.days ?? 14);
  if (!(days >= 1 && days <= SANDBOX_MAX_DAYS)) throw new Error(`Days must be between 1 and ${SANDBOX_MAX_DAYS}.`);
  const color = input.color?.trim();
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error("Color must look like #1F4E79.");
  const logoText = (input.logoText?.trim() || initials(name)).toUpperCase().replace(/[^A-Z0-9&]/g, "").slice(0, 3) || "NM";
  const hosts = input.host ? [normalizeHost(input.host)] : [];
  if (hosts.some((h) => !/^[a-z0-9.-]+(:\d+)?$/.test(h))) throw new Error("That address doesn't look right.");

  await withProvisioner(async (db) => {
    const taken = await db.query("select 1 from tenants where slug = $1", [slug]);
    if (taken.rowCount) throw new Error(`A workspace called "${slug}" already exists. Pick another short name.`);
    for (const h of hosts) {
      const used = await db.query("select 1 from tenant_hosts where host = $1", [h]);
      if (used.rowCount) throw new Error(`${h} is already in use.`);
    }
    const active = await db.query<{ n: number }>("select count(*)::int as n from tenants where sandbox_expires_at > now()");
    if (active.rows[0].n >= SANDBOX_MAX_ACTIVE) throw new Error(`There are already ${SANDBOX_MAX_ACTIVE} open sandboxes. Delete one first.`);
  });

  const tenantId = await provisionSampleTenant({
    slug,
    name,
    tier: "operate",
    products: ["foundation", "workspace", "insight"],
    isDemo: true,
    hosts,
    logoText,
    allowedMethods: ["demo"],
    members: [...DEMO_PERSONAS.map((p) => ({ ...p, persona: p.persona })), ...DEMO_OTHER_MEMBERS.map((m) => ({ ...m, scope: null, persona: null }))],
  });

  const code = newSandboxCode();
  const expiresAt = new Date(now.getTime() + days * 86_400_000);
  await withProvisioner(async (db) => {
    await db.query("update tenants set sandbox_expires_at = $2, sandbox_code_hash = $3 where id = $1", [tenantId, expiresAt, hashCode(code)]);
  });
  await withProvisioner(
    async (db) => {
      await db.query("update branding set signin_message = $1 where tenant_id = $2", [`A private sandbox prepared for ${name}, with sample data. Pick a person to see what they see.`, tenantId]);
      if (color) await db.query("update branding set primary_color = $1 where tenant_id = $2", [color, tenantId]);
      await db.query(
        "insert into audit_log (tenant_id, actor_user_id, actor_kind, action, target, detail) values ($1, null, 'staff', 'sandbox.create', $2, $3)",
        [tenantId, slug, JSON.stringify({ days, hosts })],
      );
    },
    { tenantId },
  );
  return { slug, name, code, expiresAt, hosts };
}

function initials(name: string) {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !/^(inc|llc|co|corp|the|and)$/i.test(w));
  return (words.length >= 2 ? words[0][0] + words[1][0] : (words[0] ?? "NM").slice(0, 2)).toUpperCase();
}

export type SandboxRow = { slug: string; name: string; expires_at: Date; hosts: string[]; last_sign_in: Date | null; entries: number };

export async function listSandboxes(): Promise<SandboxRow[]> {
  const rows = await withProvisioner(async (db) =>
    (
      await db.query<{ id: string; slug: string; name: string; expires_at: Date; hosts: string[] | null; last_sign_in: Date | null }>(
        `select t.id, t.slug, t.name, t.sandbox_expires_at as expires_at,
                (select array_agg(h.host order by h.host) from tenant_hosts h where h.tenant_id = t.id) as hosts,
                (select max(s.created_at) from sessions s where s.tenant_id = t.id) as last_sign_in
         from tenants t where t.sandbox_expires_at is not null order by t.sandbox_expires_at`,
      )
    ).rows,
  );
  const out: SandboxRow[] = [];
  for (const r of rows) {
    const entries = await withProvisioner(async (db) => (await db.query<{ n: number }>("select count(*)::int as n from input_entries")).rows[0].n, { tenantId: r.id });
    out.push({ slug: r.slug, name: r.name, expires_at: r.expires_at, hosts: r.hosts ?? [], last_sign_in: r.last_sign_in, entries });
  }
  return out;
}

/** Keep a sandbox open longer and give it a fresh code (the old one stops working). */
export async function extendSandbox(slug: string, days: number, now = new Date()): Promise<{ code: string; expiresAt: Date }> {
  if (!(days >= 1 && days <= SANDBOX_MAX_DAYS)) throw new Error(`Days must be between 1 and ${SANDBOX_MAX_DAYS}.`);
  const code = newSandboxCode();
  const expiresAt = new Date(now.getTime() + days * 86_400_000);
  const r = await withProvisioner((db) =>
    db.query("update tenants set sandbox_expires_at = $2, sandbox_code_hash = $3 where slug = $1 and sandbox_expires_at is not null", [slug, expiresAt, hashCode(code)]),
  );
  if (!r.rowCount) throw new Error(`No sandbox called "${slug}".`);
  await withProvisioner((db) => db.query("delete from sessions where tenant_id = (select id from tenants where slug = $1)", [slug]));
  return { code, expiresAt };
}

/** Delete one sandbox and everything in it. Refuses anything that isn't a sandbox. */
export async function deleteSandbox(slug: string): Promise<boolean> {
  return withProvisioner(async (db) => {
    const t = await db.query<{ id: string }>("select id from tenants where slug = $1 and sandbox_expires_at is not null and is_demo", [slug]);
    if (!t.rows[0]) return false;
    await db.query("delete from sessions where tenant_id = $1", [t.rows[0].id]);
    await db.query("delete from tenants where id = $1 and sandbox_expires_at is not null and is_demo", [t.rows[0].id]);
    return true;
  });
}

/** Nightly: delete every sandbox past its end date. */
export async function deleteExpiredSandboxes(now = new Date()): Promise<string[]> {
  const expired = await withProvisioner(async (db) => (await db.query<{ slug: string }>("select slug from tenants where sandbox_expires_at <= $1 and is_demo", [now])).rows);
  const gone: string[] = [];
  for (const e of expired) if (await deleteSandbox(e.slug)) gone.push(e.slug);
  return gone;
}

/** Does this code open this sandbox? Constant-time comparison of hashes. */
export async function sandboxCodeOk(tenantId: string, code: string | null | undefined): Promise<boolean> {
  if (!code || normCode(code).length !== 12) return false;
  const r = await withPlatform((db) => db.query<{ h: string | null }>("select sandbox_code_hash as h from tenants where id = $1 and sandbox_expires_at > now()", [tenantId]));
  const want = r.rows[0]?.h;
  if (!want) return false;
  const got = hashCode(code);
  return timingSafeEqual(Buffer.from(got), Buffer.from(want));
}
