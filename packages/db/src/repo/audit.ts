import type { Db } from "../client";

/* Append-only audit log, visible to the tenant (Spec §15). portal_app has no
   UPDATE or DELETE on this table. */

export type AuditInput = {
  tenantId: string;
  actorUserId: string | null;
  actorKind: "user" | "staff" | "system" | "demo";
  action: string;
  target?: string | null;
  detail?: Record<string, unknown>;
  ip?: string | null;
};

export async function audit(db: Db, a: AuditInput) {
  await db.query(
    "insert into audit_log (tenant_id, actor_user_id, actor_kind, action, target, detail, ip) values ($1, $2, $3, $4, $5, $6, $7)",
    [a.tenantId, a.actorUserId, a.actorKind, a.action, a.target ?? null, JSON.stringify(a.detail ?? {}), a.ip ?? null],
  );
}

export type AuditRow = { id: string; at: Date; actor_kind: string; actor_name: string | null; action: string; target: string | null; detail: Record<string, unknown>; ip: string | null };

export async function listAudit(db: Db, opts: { limit?: number; action?: string } = {}) {
  const r = await db.query<AuditRow>(
    `select a.id, a.at, a.actor_kind, u.name as actor_name, a.action, a.target, a.detail, a.ip
     from audit_log a left join users u on u.id = a.actor_user_id
     where ($1::text is null or a.action like $1 || '%')
     order by a.at desc, a.id desc limit $2`,
    [opts.action ?? null, Math.min(opts.limit ?? 200, 500)],
  );
  return r.rows;
}
