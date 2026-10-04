import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fmt } from "@numarket/blocks";
import { withTenant } from "@numarket/db";
import { getScreen, listEntries } from "@numarket/db/repo/workspace";
import ActionForm, { Submit } from "@/components/ActionForm";
import EntryForm from "@/components/EntryForm";
import PendingNote from "@/components/PendingNote";
import { ago, jobsInScope, todayIn, workspace } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { deleteEntry, submitEntry } from "../../../actions";

export const metadata: Metadata = { title: "Input screen" };

export default async function InputScreen({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await requireTenant("input.submit");
  const { slug } = await params;
  const ws = await workspace(ctx);
  const { screen, entries } = await withTenant(
    ctx.tenant.id,
    async (db) => ({ screen: await getScreen(db, slug), entries: await listEntries(db, { screen: slug, userId: ctx.can("input.edit_any") ? undefined : ctx.user.id, limit: 25 }) }),
    { userId: ctx.user.id },
  );
  if (!screen) notFound();
  const jobs = jobsInScope(ws.snapshot?.datasets, ctx);
  const jobName = Object.fromEntries(jobs.map((j) => [j.code, j.name]));
  const show = (key: string, v: unknown) => {
    if (key === "job") return jobName[String(v)] ?? String(v);
    if (key === "amount") return fmt(v, "money", { full: true });
    if (key === "date") return fmt(v, "date");
    if (key === "crew_hours") return `${fmt(v, "num")} crew hours`;
    if (key === "pct_complete") return `${fmt(v, "num")}% complete`;
    return String(v ?? "");
  };

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            <Link href="/inputs">Input screens</Link>
          </p>
          <h1>{screen.title}</h1>
          <p>{screen.description}</p>
        </div>
      </div>
      <div className="grid-2" style={{ alignItems: "start" }}>
        <section className="card" style={{ maxWidth: 520 }}>
          <EntryForm action={submitEntry} screen={slug} fields={screen.fields} jobs={jobs} today={todayIn(ctx.tenant.timezone)} />
        </section>
        <section className="stack">
          <PendingNote ctx={ctx} pending={ws.pending} nextUpdate={ws.nextUpdate} />
          <div className="card">
            <h2>{ctx.can("input.edit_any") ? "Recent entries" : "Your entries"}</h2>
            {entries.length ? (
              <ul className="list">
                {entries.map((e) => (
                  <li key={e.id} className="item">
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <b className="small">
                        {screen.fields
                          .filter((f) => f.key !== "note" && f.key !== "description" && e.data[f.key] !== undefined)
                          .slice(0, 4)
                          .map((f) => show(f.key, e.data[f.key]))
                          .join(" · ")}
                      </b>
                      <span className={`pill ${e.status}`}>{e.status === "pending" ? "Waiting for next update" : `In dashboards (v${e.applied_in_version})`}</span>
                    </div>
                    {Boolean(e.data.note || e.data.description) && <p className="small muted" style={{ margin: "4px 0 0" }}>{String(e.data.note ?? e.data.description)}</p>}
                    <div className="row small muted" style={{ justifyContent: "space-between", marginTop: 6 }}>
                      <span>
                        {e.by_name ?? "Someone"} · {ago(e.created_at)}
                      </span>
                      {e.status === "pending" && (e.created_by === ctx.user.id || ctx.can("input.edit_any")) && (
                        <ActionForm action={deleteEntry}>
                          <input type="hidden" name="id" value={e.id} />
                          <Submit className="btn btn-ghost btn-sm">Remove</Submit>
                        </ActionForm>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">No entries yet. Your first one will show up here right away.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
