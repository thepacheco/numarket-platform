import { resolveRange, type Block, type Datasets, type KpiBlock } from "@numarket/blocks";
import { BlockView, type BlockContext, type Defs } from "@numarket/blocks/react";
import type { TenantContext } from "@numarket/auth";
import type { ReportLayout } from "@numarket/db/repo/workspace";
import { asOfMonth } from "./Dashboard";

/* A status report in the client's format (Spec §12.3): numbers fill in from a
   published snapshot, commentary is written by people. "Prepared for"
   reports carry the client's customer's name for reports they send on. */
export default function ReportDocument({
  layout, commentary, datasets, publishedAt, ctx, defs, brand, title, meta,
}: {
  layout: ReportLayout; commentary: Record<string, string>; datasets: Datasets; publishedAt: Date | string; ctx: TenantContext; defs: Defs;
  brand: { name: string; logo: string; footer: string | null }; title: string; meta: string;
}) {
  const c: BlockContext = { datasets, scope: ctx.scope, eq: { job: layout.job ?? undefined }, range: resolveRange(asOfMonth(publishedAt, ctx.tenant.timezone), layout.range ?? "12m"), defs };
  return (
    <article className="report-doc" aria-label={title}>
      <header className="report-head">
        <span className="logo-chip">{brand.logo}</span>
        <div>
          <b style={{ fontSize: 18, display: "block" }}>{layout.prepared_for ? `Prepared for ${layout.prepared_for}` : brand.name}</b>
          <span style={{ fontSize: 13.5, opacity: 0.88 }}>
            {title} · {meta}
          </span>
        </div>
      </header>
      <div className="report-body">
        {layout.sections.map((s, i) => {
          if (s.type === "kpis") {
            const blocks = s.blocks as KpiBlock[];
            return (
              <div className="dash-row kpis" key={i} style={{ ["--n" as string]: Math.min(4, blocks.length) }}>
                {blocks.map((b, j) => (
                  <BlockView key={j} block={b} c={c} />
                ))}
              </div>
            );
          }
          if (s.type === "pagebreak") return <hr key={i} className="page-break" aria-label="Page break" />;
          if (s.type === "commentary") {
            return (
              <section key={i}>
                <h2>{s.title}</h2>
                <p className="commentary">{commentary[s.key]?.trim() || <span style={{ color: "#6a7d8e" }}>Not written yet.</span>}</p>
              </section>
            );
          }
          const b = s.block as Block;
          return (
            <div className="dash-row" key={i} style={{ ["--cols" as string]: 1 }}>
              <BlockView block={{ ...b, span: 1 }} c={c} />
            </div>
          );
        })}
      </div>
      <footer className="report-foot">
        {layout.prepared_for ? `Prepared by ${brand.name}. ` : ""}
        {brand.footer ?? ""}
      </footer>
    </article>
  );
}
