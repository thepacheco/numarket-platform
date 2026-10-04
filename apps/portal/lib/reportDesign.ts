import "server-only";
import type { DashboardLayout } from "@numarket/blocks";
import type { TenantContext } from "@numarket/auth";
import type { ReportLayout, ReportSection } from "@numarket/db/repo/workspace";

/* Turns a design sent from the report builder into a stored layout, checking
   every section on the server: known section kinds, building blocks that
   use this workspace's datasets, sensible sizes, and the person's scope. */

const BLOCK_TYPES = new Set(["kpi", "trend", "columns", "bar", "stacked", "table", "statement"]);
const PERIODS = new Set(["week", "two weeks", "month"]);
const RANGES = new Set(["lm", "3m", "12m", "ytd"]);

type In = { title?: unknown; description?: unknown; prepared_for?: unknown; job?: unknown; period?: unknown; range?: unknown; sections?: unknown };
type AnyBlock = { type?: unknown; title?: unknown; dataset?: unknown };

/** Datasets used only by company-wide dashboards (financials). */
export function companyDatasets(dashboards: { layout: unknown }[]) {
  const wide = new Set<string>(), scoped = new Set<string>();
  for (const d of dashboards) {
    const l = d.layout as DashboardLayout;
    for (const p of l.pages) for (const r of p.rows) for (const b of r) (l.wholeCompany ? wide : scoped).add(b.dataset);
  }
  return new Set([...wide].filter((x) => !scoped.has(x)));
}

export function toLayout(raw: string, ctx: TenantContext, opts: { datasets: Set<string>; company: Set<string>; jobs: string[] }):
  { ok: true; title: string; description: string; layout: ReportLayout } | { ok: false; message: string } {
  if (raw.length > 60_000) return { ok: false, message: "That design is too large." };
  let d: In;
  try {
    d = JSON.parse(raw);
  } catch {
    return { ok: false, message: "The design couldn't be read." };
  }
  const title = String(d.title ?? "").trim().slice(0, 80);
  if (!title) return { ok: false, message: "Give the report a title." };
  const job = String(d.job ?? "");
  if (job && !opts.jobs.includes(job)) return { ok: false, message: "Pick a job you can see." };
  if (ctx.scope && !job) return { ok: false, message: "Pick one of your jobs for this report." };
  if (!Array.isArray(d.sections) || d.sections.length === 0) return { ok: false, message: "Add at least one section." };
  if (d.sections.length > 30) return { ok: false, message: "A report can have up to 30 sections." };

  const block = (b: AnyBlock) => {
    if (!b || typeof b !== "object" || !BLOCK_TYPES.has(String(b.type)) || !opts.datasets.has(String(b.dataset))) return null;
    if (JSON.stringify(b).length > 6000) return null;
    if (ctx.scope && opts.company.has(String(b.dataset))) return null;
    return { ...b, title: String(b.title ?? "").slice(0, 80) };
  };
  /* a one-job report usually goes to that job's customer: no company-wide numbers */
  const companyIn = (b: AnyBlock) => !!b && typeof b === "object" && opts.company.has(String(b.dataset));
  if (job) {
    for (const s of d.sections as Record<string, unknown>[]) {
      const blocks = s.kind === "kpis" && Array.isArray(s.blocks) ? (s.blocks as AnyBlock[]) : s.kind === "block" ? [s.block as AnyBlock] : [];
      if (blocks.some(companyIn)) return { ok: false, message: "A report for one job can't include company-wide numbers like the P&L, cash, or receivables. Remove them or choose All jobs." };
    }
  }

  const sections: ReportSection[] = [];
  let wholeCompany = false;
  for (const s of d.sections as Record<string, unknown>[]) {
    if (s.kind === "commentary") {
      const key = String(s.key ?? "");
      if (!/^[a-z][a-z0-9_]{0,23}$/.test(key)) return { ok: false, message: "A text section is missing its id." };
      sections.push({ type: "commentary", key, title: String(s.title ?? "").trim().slice(0, 60) || "Section", placeholder: String(s.placeholder ?? "").slice(0, 160) || undefined });
    } else if (s.kind === "kpis") {
      const list = (Array.isArray(s.blocks) ? s.blocks : []).slice(0, 4).map((b) => block(b as AnyBlock));
      if (list.some((b) => !b || b.type !== "kpi")) return { ok: false, message: "One of the key numbers isn't available to you." };
      if (!list.length) continue;
      if (list.some((b) => opts.company.has(String(b!.dataset)))) wholeCompany = true;
      sections.push({ type: "kpis", blocks: list });
    } else if (s.kind === "block") {
      const b = block(s.block as AnyBlock);
      if (!b || b.type === "kpi") return { ok: false, message: "One of the charts or tables isn't available to you." };
      if (opts.company.has(String(b.dataset))) wholeCompany = true;
      sections.push({ type: "block", block: b });
    } else if (s.kind === "pagebreak") {
      if (sections.length && sections[sections.length - 1].type !== "pagebreak") sections.push({ type: "pagebreak" });
    } else return { ok: false, message: "Unknown section." };
  }
  if (new Set(sections.flatMap((s) => (s.type === "commentary" ? [s.key] : []))).size !== sections.filter((s) => s.type === "commentary").length)
    return { ok: false, message: "Two text sections share an id." };
  return {
    ok: true,
    title,
    description: String(d.description ?? "").trim().slice(0, 200),
    layout: {
      prepared_for: String(d.prepared_for ?? "").trim().slice(0, 80) || null,
      job: job || null,
      period: PERIODS.has(String(d.period)) ? String(d.period) : "week",
      range: RANGES.has(String(d.range)) ? String(d.range) : "12m",
      wholeCompany,
      sections,
    },
  };
}

/** The builder's view of a stored layout. */
export function toDesign(title: string, description: string, l: ReportLayout) {
  return {
    title,
    description,
    prepared_for: l.prepared_for ?? "",
    job: l.job ?? "",
    period: l.period ?? "week",
    range: l.range ?? "12m",
    sections: l.sections.map((s) =>
      s.type === "commentary"
        ? { kind: "commentary" as const, key: s.key, title: s.title, placeholder: s.placeholder }
        : s.type === "kpis"
          ? { kind: "kpis" as const, blocks: s.blocks as { type: string; title: string; dataset: string }[] }
          : s.type === "block"
            ? { kind: "block" as const, block: s.block as { type: string; title: string; dataset: string } }
            : { kind: "pagebreak" as const },
    ),
  };
}
