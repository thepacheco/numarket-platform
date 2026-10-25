import type { Metadata } from "next";
import Link from "next/link";
import { fmt } from "@numarket/blocks";
import { withTenant } from "@numarket/db";
import { canSeeRequest, changeHoursUsed, KIND_LABEL, listRequests, REQUEST_STATUSES, STATUS_LABEL, type RequestKind, type RequestProduct, type RequestRow } from "@numarket/db/repo/requests";
import { TIER_LIMITS } from "@numarket/metering";
import Icon from "@/components/Icon";
import SolidIcon from "@/components/solids/SolidIcon";
import { ago, monthStartIn } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { PRODUCT_INFO } from "@/lib/nav";

export const metadata: Metadata = { title: "Requests" };

const KIND_FILTERS: { id: RequestKind | "all"; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "change", label: "Changes" },
  { id: "app", label: "App ideas" },
  { id: "issue", label: "Issues" },
  { id: "improvement", label: "Improvements" },
  { id: "question", label: "Questions" },
];

function Card({ r, me }: { r: RequestRow; me: string }) {
  const cost = r.quote_amount ? `Quoted ${fmt(Number(r.quote_amount), "money", { full: true })}` : r.estimate_hours ? `~${Number(r.estimate_hours)} change ${Number(r.estimate_hours) === 1 ? "hour" : "hours"}` : null;
  return (
    <Link href={`/requests/${r.id}`} className={`req-card p-${r.product} ${r.status === "review" && r.requested_by === me ? "waiting" : ""}`}>
      <span className="req-card-top">
        <span className="req-kind-chip">{KIND_LABEL[r.kind]}</span>
        {r.priority === "high" && r.status !== "done" && <span className="pill risk">Urgent</span>}
      </span>
      <b>{r.title}</b>
      <span className="small muted">
        {r.by_name ?? "Someone"} · {ago(r.created_at)}
      </span>
      <span className="req-card-foot small">
        <SolidIcon kind={r.product} size={14} />
        <span>{PRODUCT_INFO[r.product].name}</span>
        {r.updates > 1 && (
          <span className="req-n" title={`${r.updates} updates`}>
            <Icon name="chat" /> {r.updates}
          </span>
        )}
      </span>
      {(cost || (r.assignee && r.status !== "submitted")) && (
        <span className="small muted tnum">{[cost, r.assignee && r.status !== "submitted" ? `with ${r.assignee}` : null].filter(Boolean).join(" · ")}</span>
      )}
    </Link>
  );
}

export default async function Requests({ searchParams }: { searchParams: Promise<{ kind?: string; product?: string; mine?: string }> }) {
  const ctx = await requireTenant("requests.view");
  const q = await searchParams;
  const who = { userId: ctx.user.id, scoped: !!ctx.scope };
  const rows = (await withTenant(ctx.tenant.id, (db) => listRequests(db), { userId: ctx.user.id })).filter((r) => canSeeRequest(r, who));
  const limits = TIER_LIMITS[ctx.tenant.tier];
  const used = changeHoursUsed(rows, monthStartIn(ctx.tenant.timezone));
  const month = new Date().toLocaleDateString("en-US", { month: "long", timeZone: ctx.tenant.timezone });
  const waiting = rows.filter((r) => r.status === "review" && (r.requested_by === ctx.user.id || ctx.can("requests.approve")));

  const kind = KIND_FILTERS.some((k) => k.id === q.kind) ? (q.kind as RequestKind | "all") : "all";
  const product = q.product && q.product in PRODUCT_INFO ? (q.product as RequestProduct) : null;
  const mine = q.mine === "1";
  /* questions live under Your analyst; they show here only when asked for */
  const shown = rows.filter((r) => (kind === "all" ? r.kind !== "question" : r.kind === kind) && (!product || r.product === product) && (!mine || r.requested_by === ctx.user.id));
  const href = (p: { kind?: string; product?: string | null; mine?: boolean }) => {
    const s = new URLSearchParams();
    const k = p.kind ?? kind;
    const pr = p.product === undefined ? product : p.product;
    const m = p.mine ?? mine;
    if (k !== "all") s.set("kind", k);
    if (pr) s.set("product", pr);
    if (m) s.set("mine", "1");
    const qs = s.toString();
    return qs ? `/requests?${qs}` : "/requests";
  };
  const doneCutoff = Date.now() - 45 * 86_400_000;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Everything numarket is working on for you</p>
          <h1>Requests</h1>
          <p>Dashboard changes, new app ideas, issues, and improvements, on one board. Add one any time; your analyst moves it along and replies on the card.</p>
        </div>
        {ctx.can("requests.submit") && (
          <Link href="/requests/new" className="btn btn-primary">
            <Icon name="plus" /> New request
          </Link>
        )}
      </div>

      <div className="req-stats">
        <div className={`req-stat ${waiting.length ? "attn" : ""}`}>
          <small>Waiting on you</small>
          <b className="tnum">{waiting.length}</b>
          <span className="small muted">{waiting.length ? "Ready for your review: approve it or send it back." : "Nothing to sign off."}</span>
        </div>
        <div className="req-stat">
          <small>Change hours in {month}</small>
          {limits.changeHoursPerMonth === null ? (
            <>
              <b>Dedicated analyst</b>
              <span className="small muted">Your plan doesn&apos;t count change hours.</span>
            </>
          ) : (
            <>
              <b className="tnum">
                {used} of {limits.changeHoursPerMonth}
              </b>
              <span className="req-meter" aria-hidden="true">
                <i style={{ width: `${Math.min(100, (used / limits.changeHoursPerMonth) * 100)}%` }} />
              </span>
              <span className="small muted">Extra hours are $175, in blocks of 5. Unused hours don&apos;t roll over.</span>
            </>
          )}
        </div>
        <div className="req-stat">
          <small>Reply time</small>
          <b>{limits.replyTime}</b>
          <span className="small muted">From your analyst, on every request.</span>
        </div>
      </div>

      <div className="req-filters">
        <nav className="range-seg" aria-label="Kind of request">
          {KIND_FILTERS.map((k) => (
            <Link key={k.id} href={href({ kind: k.id })} aria-current={kind === k.id}>
              {k.label}
            </Link>
          ))}
        </nav>
        <nav className="req-prods" aria-label="Product">
          {(Object.keys(PRODUCT_INFO) as RequestProduct[]).map((p) => (
            <Link key={p} href={href({ product: product === p ? null : p })} aria-current={product === p} className={`p-${p}`} title={PRODUCT_INFO[p].tagline}>
              <SolidIcon kind={p} size={14} /> {PRODUCT_INFO[p].name}
            </Link>
          ))}
        </nav>
        <Link href={href({ mine: !mine })} className={`req-mine ${mine ? "on" : ""}`} aria-current={mine}>
          {mine ? "✓ " : ""}Only mine
        </Link>
      </div>

      <div className="req-board">
        {REQUEST_STATUSES.map((s) => {
          const col = shown.filter((r) => r.status === s && (s !== "done" || (r.done_at ?? r.updated_at).getTime() >= doneCutoff));
          return (
            <section key={s} className={`req-col st-${s}`} aria-label={STATUS_LABEL[s]}>
              <h2>
                {STATUS_LABEL[s]} <span className="tnum">{col.length}</span>
              </h2>
              {col.length === 0 ? (
                <p className="req-empty">{s === "review" ? "Nothing waiting on you." : s === "done" ? "Nothing finished in the last 45 days." : "Nothing here."}</p>
              ) : (
                col.map((r) => <Card key={r.id} r={r} me={ctx.user.id} />)
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
