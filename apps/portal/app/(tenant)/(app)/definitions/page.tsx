import type { Metadata } from "next";
import { withTenant } from "@numarket/db";
import { countSuggestions, listDefinitions } from "@numarket/db/repo/workspace";
import ActionForm, { Submit } from "@/components/ActionForm";
import { ago } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { suggestDefinitionChange } from "../../actions";

export const metadata: Metadata = { title: "Definitions" };

/* Business definitions: the data dictionary inside Foundation. */
export default async function Definitions() {
  const ctx = await requireTenant("definitions.view");
  const { defs, suggestions } = await withTenant(ctx.tenant.id, async (db) => ({ defs: await listDefinitions(db), suggestions: await countSuggestions(db) }));
  const sug = Object.fromEntries(suggestions.map((s) => [s.key, s.n]));
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Your data</p>
          <h1>Definitions</h1>
          <p>What every number means, how it&apos;s calculated, and where it comes from. Dashboards, reports, and Ask Your Data all use these.</p>
        </div>
      </div>
      <ul className="list">
        {defs.map((d) => (
          <li key={d.key} className="item">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3>{d.name}</h3>
              <span className="small muted">Owner: {d.owner}</span>
            </div>
            <p style={{ margin: "6px 0 10px" }}>{d.means}</p>
            <dl className="kv small">
              <dt>Calculated as</dt>
              <dd>{d.formula}</dd>
              <dt>Comes from</dt>
              <dd>{d.sources}</dd>
              <dt>Last changed</dt>
              <dd>{ago(d.updated_at)}</dd>
            </dl>
            {ctx.can("definitions.suggest") && (
              <details style={{ marginTop: 10 }}>
                <summary className="small" style={{ cursor: "pointer", color: "var(--brand-text)", fontWeight: 600 }}>
                  Suggest a change{sug[d.key] ? ` (${sug[d.key]} sent)` : ""}
                </summary>
                <ActionForm action={suggestDefinitionChange} className="stack" resetOnSuccess>
                  <input type="hidden" name="key" value={d.key} />
                  <div className="field" style={{ marginTop: 8 }}>
                    <label htmlFor={`s-${d.key}`}>What should change?</label>
                    <textarea id={`s-${d.key}`} name="body" className="input" maxLength={1000} required placeholder="For example: exclude retainage from Spent to date." />
                  </div>
                  <div>
                    <Submit className="btn btn-secondary btn-sm">Send to the analyst</Submit>
                  </div>
                </ActionForm>
              </details>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
