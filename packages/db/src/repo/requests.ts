import type { Db } from "../client";

/* The Requests board: everything numarket is working on for a client, in one
   place. Clients add requests and comment; numarket moves them along; the
   person who asked (or an admin) signs off when it's ready for review.
   Callers check permissions before calling. */

export const REQUEST_KINDS = ["change", "app", "issue", "improvement", "question"] as const;
export const REQUEST_STATUSES = ["submitted", "planned", "in_progress", "review", "done"] as const;
export const REQUEST_PRODUCTS = ["foundation", "workspace", "insight", "engineering"] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type RequestProduct = (typeof REQUEST_PRODUCTS)[number];

export const KIND_LABEL: Record<RequestKind, string> = {
  change: "Dashboard or report change",
  app: "New app idea",
  issue: "Something's wrong",
  improvement: "Improvement",
  question: "Question for your analyst",
};
export const STATUS_LABEL: Record<RequestStatus, string> = {
  submitted: "Submitted",
  planned: "Planned",
  in_progress: "In progress",
  review: "Ready for your review",
  done: "Done",
};

export type SketchBlock = "kpis" | "line" | "bars" | "table" | "matrix" | "heatmap";
export type RequestRow = {
  id: string;
  kind: RequestKind;
  product: RequestProduct;
  title: string;
  detail: string;
  status: RequestStatus;
  priority: "low" | "normal" | "high";
  link: string | null;
  sketch: SketchBlock[] | null;
  estimate_hours: string | null;
  quote_amount: string | null;
  assignee: string | null;
  requested_by: string | null;
  by_name: string | null;
  created_at: Date;
  updated_at: Date;
  done_at: Date | null;
  updates: number;
};
export type RequestUpdate = { id: string; author: string; user_id: string | null; body: string; status: RequestStatus | null; created_at: Date };

const COLS = `r.id, r.kind, r.product, r.title, r.detail, r.status, r.priority, r.link, r.sketch, r.estimate_hours, r.quote_amount, r.assignee,
  r.requested_by, u.name as by_name, r.created_at, r.updated_at, r.done_at,
  (select count(*)::int from request_updates x where x.request_id = r.id) as updates`;

export async function listRequests(db: Db) {
  return (await db.query<RequestRow>(`select ${COLS} from requests r left join users u on u.id = r.requested_by order by r.updated_at desc`)).rows;
}

export async function getRequest(db: Db, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return (await db.query<RequestRow>(`select ${COLS} from requests r left join users u on u.id = r.requested_by where r.id = $1`, [id])).rows[0] ?? null;
}

export async function requestUpdates(db: Db, id: string) {
  return (await db.query<RequestUpdate>("select id, author, user_id, body, status, created_at from request_updates where request_id = $1 order by created_at", [id])).rows;
}

export async function insertRequest(
  db: Db,
  r: { kind: RequestKind; product: RequestProduct; title: string; detail: string; priority: "low" | "normal" | "high"; link: string | null; sketch: SketchBlock[] | null; userId: string },
) {
  const res = await db.query<{ id: string }>(
    `insert into requests (tenant_id, kind, product, title, detail, priority, link, sketch, requested_by)
     values (current_tenant(), $1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [r.kind, r.product, r.title, r.detail, r.priority, r.link, r.sketch ? JSON.stringify(r.sketch) : null, r.userId],
  );
  return res.rows[0].id;
}

export async function addRequestUpdate(db: Db, id: string, u: { author: string; userId: string | null; body: string; status?: RequestStatus | null }) {
  await db.query("insert into request_updates (tenant_id, request_id, user_id, author, body, status) values (current_tenant(), $1, $2, $3, $4, $5)", [id, u.userId, u.author, u.body, u.status ?? null]);
  if (u.status) await db.query("update requests set status = $2, updated_at = now(), done_at = case when $2 = 'done' then now() else null end where id = $1", [id, u.status]);
  else await db.query("update requests set updated_at = now() where id = $1", [id]);
}

/** Answers to questions can carry company-wide numbers, so people limited
    to certain jobs see only the questions they asked themselves. */
export function canSeeRequest(r: Pick<RequestRow, "kind" | "requested_by">, who: { userId: string; scoped: boolean }) {
  return r.kind !== "question" || !who.scoped || r.requested_by === who.userId;
}

/** The analyst's latest reply on each question, for the Questions list. */
export async function latestAnswers(db: Db) {
  const rows = (
    await db.query<{ request_id: string; author: string; body: string; created_at: Date }>(
      `select distinct on (u.request_id) u.request_id, u.author, u.body, u.created_at
       from request_updates u join requests r on r.id = u.request_id
       where r.kind = 'question' and u.user_id is null and u.status = 'done'
       order by u.request_id, u.created_at desc`,
    )
  ).rows;
  return new Map(rows.map((r) => [r.request_id, r]));
}

/** Change hours used this month: work numarket started on change requests this month. */
export function changeHoursUsed(rows: RequestRow[], monthStart: Date) {
  return rows
    .filter((r) => r.kind === "change" && r.estimate_hours && ["in_progress", "review", "done"].includes(r.status) && (r.done_at ?? r.updated_at) >= monthStart)
    .reduce((t, r) => t + Number(r.estimate_hours), 0);
}

/** Requests ready for review that this person can sign off: their own, or anyone's for admins. */
export async function countWaitingOn(db: Db, userId: string, anyone: boolean) {
  return (await db.query<{ n: number }>("select count(*)::int as n from requests where status = 'review' and ($2 or requested_by = $1)", [userId, anyone])).rows[0].n;
}
