import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { withTenant } from "@numarket/db";
import { ESTIMATE_SECTIONS, type EstimateData } from "@numarket/db/demo/apps";
import { getAppRecord } from "@numarket/db/repo/workspace";
import ActionForm, { Submit } from "@/components/ActionForm";
import EstimateBuilder from "@/components/EstimateBuilder";
import { ago, workspace } from "@/lib/data";
import { pricingHistory } from "@/lib/estimates";
import { requireTenant } from "@/lib/guard";
import { saveEstimate, setEstimateStatus } from "../../../../actions";

export const metadata: Metadata = { title: "Estimate" };

const NEXT: Record<string, { status: string; label: string }[]> = {
  draft: [{ status: "sent", label: "Mark sent" }],
  sent: [
    { status: "won", label: "Mark won" },
    { status: "lost", label: "Mark lost" },
    { status: "draft", label: "Back to draft" },
  ],
  won: [{ status: "sent", label: "Reopen" }],
  lost: [{ status: "sent", label: "Reopen" }],
};
const LABEL: Record<string, string> = { draft: "Draft", sent: "Sent", won: "Won", lost: "Lost" };

export default async function Estimate({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant("definitions.view");
  if (!ctx.tenant.products.includes("engineering")) redirect("/available/engineering");
  const { id } = await params;
  const isNew = id === "new";
  if (isNew && !ctx.can("input.submit")) notFound();
  const rec = isNew ? null : await withTenant(ctx.tenant.id, (db) => getAppRecord(db, "estimates", id));
  if (!isNew && !rec) notFound();
  const ws = await workspace(ctx);
  const hist = pricingHistory(ws.snapshot?.datasets);
  const sections = ESTIMATE_SECTIONS[ctx.tenant.industry];
  const services = ctx.tenant.industry === "services";
  const initial: EstimateData = rec
    ? (rec.data as EstimateData)
    : { name: "", customer: "", lines: [], overheadPct: services ? 0 : 8, contingencyPct: hist?.suggested ?? 5, profitPct: services ? 0 : 7 };
  const canEdit = isNew || (!!rec && ctx.can("input.submit") && (rec.created_by === ctx.user.id || ctx.can("input.edit_any")));

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            <Link href="/apps">Apps</Link> / <Link href="/apps/estimates">{services ? "Proposals" : "Estimates"}</Link>
          </p>
          <h1>{isNew ? `New ${services ? "proposal" : "estimate"}` : initial.name}</h1>
          {rec && (
            <p>
              {initial.customer} · <span className="pill">{LABEL[rec.status] ?? rec.status}</span> · updated {ago(rec.updated_at)}
            </p>
          )}
        </div>
        {rec && canEdit && (
          <div className="row" style={{ gap: 8 }}>
            {(NEXT[rec.status] ?? []).map((n) => (
              <ActionForm key={n.status} action={setEstimateStatus}>
                <input type="hidden" name="id" value={rec.id} />
                <input type="hidden" name="status" value={n.status} />
                <Submit className={n.status === "won" ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}>{n.label}</Submit>
              </ActionForm>
            ))}
          </div>
        )}
      </div>
      <section className="card">
        <EstimateBuilder action={saveEstimate} sections={sections} initial={initial} id={rec?.id} suggestedContingency={hist?.suggested ?? null} readOnly={!canEdit} />
      </section>
      {!canEdit && <p className="small muted">Only the person who started this estimate or an admin can change it.</p>}
    </>
  );
}
