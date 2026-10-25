import type { Db } from "../client";

/* What changed in a workspace since a moment: the raw events behind the
   "What changed" panel on Home. Callers decide what each person may see
   (permissions, job scope) and pass the switches in. */

export type ActivityRow = { kind: "notice" | "reply" | "action" | "flag" | "entries" | "review"; id: string; title: string; body: string; link: string; at: Date };

export async function recentActivity(
  db: Db,
  userId: string,
  since: Date,
  can: { requests: boolean; flags: boolean; entries: "all" | "own" | "none"; reviews: boolean; jobs: string[] | null },
): Promise<ActivityRow[]> {
  const out: ActivityRow[] = [];
  /* alerts that fired, reminders, and charts people sent this person */
  for (const n of (await db.query<{ id: string; title: string; body: string; link: string | null; created_at: Date }>("select id, title, body, link, created_at from notifications where user_id = $1 and created_at >= $2 order by created_at desc limit 12", [userId, since])).rows)
    out.push({ kind: "notice", id: n.id, title: n.title, body: n.body, link: n.link ?? "/alerts", at: n.created_at });
  /* numarket's replies and moves on the Requests board (someone limited to
     certain jobs sees answers only to their own questions) */
  if (can.requests)
    for (const r of (
      await db.query<{ id: string; rid: string; title: string; body: string; status: string | null; created_at: Date }>(
        `select u.id, r.id as rid, r.title, u.body, u.status, u.created_at from request_updates u join requests r on r.id = u.request_id
         where u.user_id is null and u.created_at >= $1 and (r.kind <> 'question' or not $2 or r.requested_by = $3)
         order by u.created_at desc limit 8`,
        [since, can.jobs !== null, userId],
      )
    ).rows)
      out.push({ kind: "reply", id: r.id, title: r.title, body: r.body, link: `/requests/${r.rid}`, at: r.created_at });
  /* new questions about the data */
  if (can.flags)
    for (const f of (await db.query<{ id: string; title: string; job: string | null; created_at: Date }>("select id, title, job, created_at from flags where created_at >= $1 order by created_at desc limit 6", [since])).rows)
      if (!can.jobs || !f.job || can.jobs.includes(f.job)) out.push({ kind: "flag", id: f.id, title: f.title, body: "A question about your data", link: "/flags", at: f.created_at });
  /* what people entered (forms and uploads), counted per form */
  if (can.entries !== "none") {
    const rows = (
      await db.query<{ screen: string; title: string; n: number; last: Date }>(
        `select e.screen_slug as screen, s.title, count(*)::int as n, max(e.created_at) as last
         from input_entries e join input_screens s on s.slug = e.screen_slug
         where e.created_at >= $1 and ($2::uuid is null or e.created_by = $2) and ($3::text[] is null or e.data->>'job' is null or e.data->>'job' = any($3))
         group by e.screen_slug, s.title order by max(e.created_at) desc`,
        [since, can.entries === "own" ? userId : null, can.jobs],
      )
    ).rows;
    for (const r of rows) out.push({ kind: "entries", id: r.screen, title: `${r.n} ${r.title.toLowerCase()} ${r.n === 1 ? "entry" : "entries"}`, body: can.entries === "own" ? "Yours" : "Entered by your team", link: "/inputs", at: r.last });
  }
  /* a new review from the analyst */
  if (can.reviews)
    for (const r of (await db.query<{ id: string; title: string; analyst: string; published_at: Date }>("select id, title, analyst, published_at from reviews where published_at >= $1 order by published_at desc limit 2", [since])).rows)
      out.push({ kind: "review", id: r.id, title: `New: ${r.title}`, body: `From ${r.analyst.split(",")[0]}`, link: `/reviews/${r.id}`, at: r.published_at });
  /* action items people moved */
  if (can.reviews)
    for (const a of (
      await db.query<{ review_id: string; idx: number; status: string; updated_at: Date; title: string; name: string | null }>(
        `select s.review_id, s.idx, s.status, s.updated_at, r.content->'recommendations'->s.idx->>'title' as title, u.name
         from action_status s join reviews r on r.id = s.review_id left join users u on u.id = s.updated_by
         where s.updated_at >= $1 order by s.updated_at desc limit 6`,
        [since],
      )
    ).rows)
      out.push({ kind: "action", id: `${a.review_id}-${a.idx}`, title: a.title ?? "An action item", body: `${a.status === "done" ? "Done" : a.status === "in_progress" ? "In progress" : "Reopened"}${a.name ? ` · ${a.name}` : ""}`, link: "/reviews/actions", at: a.updated_at });
  return out.sort((a, b) => b.at.getTime() - a.at.getTime());
}
