import "server-only";
import { createHash } from "node:crypto";
import type { TenantContext } from "@numarket/auth";
import type { Db } from "@numarket/db";

/* A person's recent questions, from the audit log. Everyone visiting the
   shared demo signs in as the same sample people, so there the history is
   limited to this browser session (a one-way tag of the session, never the
   session itself). */
export const sessionTag = (ctx: TenantContext) => createHash("sha256").update(`ask:${ctx.session.id_hash}`).digest("hex").slice(0, 16);

export async function recentQuestions(db: Db, ctx: TenantContext, limit = 12) {
  const r = await db.query<{ q: string; at: Date; answered: boolean }>(
    `select distinct on (lower(target)) target as q, at, coalesce((detail->>'answered')::boolean, true) as answered
     from audit_log
     where action = 'ask.question' and actor_user_id = $1 and ($2::text is null or detail->>'tag' = $2) and at > now() - interval '90 days'
     order by lower(target), at desc`,
    [ctx.user.id, ctx.tenant.isDemo ? sessionTag(ctx) : null],
  );
  return r.rows.sort((a, b) => +b.at - +a.at).slice(0, limit);
}
