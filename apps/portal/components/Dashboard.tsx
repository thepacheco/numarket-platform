import { visibleRows, type Block, type DashboardLayout, type Datasets, type Filters } from "@numarket/blocks";
import { BlockView, type Defs } from "@numarket/blocks/react";
import type { TenantContext } from "@numarket/auth";
import AutoSubmitSelect from "./AutoSubmitSelect";

/* Renders a dashboard layout from a snapshot, for one user. Scope and filters
   are applied on the server before anything is drawn. */
export function DashboardView({ layout, datasets, ctx, filters, defs, updated, showFilters = true }: { layout: DashboardLayout; datasets: Datasets; ctx: TenantContext; filters: Filters; defs: Defs; updated: string; showFilters?: boolean }) {
  return (
    <div className="dash">
      {showFilters &&
        layout.filters?.map((f) => {
          const options = visibleRows(datasets, f.dataset, ctx.scope).map((r) => ({ v: String(r[f.field]), l: String(r[f.labelField]) }));
          if (options.length < 2) return null;
          return (
            <form method="get" className="filters" key={f.field}>
              <div className="field">
                <label htmlFor={`f-${f.field}`}>{f.label}</label>
                <AutoSubmitSelect id={`f-${f.field}`} name={f.field} defaultValue={filters[f.field] ?? ""} className="input">
                  <option value="">All {ctx.scope ? "in your scope" : ""}</option>
                  {options.map((o) => (
                    <option key={o.v} value={o.v}>
                      {o.l}
                    </option>
                  ))}
                </AutoSubmitSelect>
              </div>
              <noscript>
                <button className="btn btn-secondary" type="submit">
                  Apply
                </button>
              </noscript>
            </form>
          );
        })}
      {layout.rows.map((row, i) => (
        <div className={`dash-row ${row.every((b) => b.type === "kpi") ? "kpis" : ""}`} key={i} style={row.every((b) => b.type === "kpi") ? { ["--cols" as string]: Math.min(4, row.length) } : undefined}>
          {row.map((b: Block, j) => (
            <BlockView key={j} block={b} rows={visibleRows(datasets, b.dataset, ctx.scope, filters)} defs={defs} updated={updated} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Keep only filter values the user is allowed to pick. */
export function cleanFilters(layout: DashboardLayout, datasets: Datasets, ctx: TenantContext, params: Record<string, string | string[] | undefined>): Filters {
  const out: Filters = {};
  for (const f of layout.filters ?? []) {
    const v = params[f.field];
    const value = Array.isArray(v) ? v[0] : v;
    if (!value) continue;
    const allowed = visibleRows(datasets, f.dataset, ctx.scope).some((r) => String(r[f.field]) === value);
    if (allowed) out[f.field] = value;
  }
  return out;
}
