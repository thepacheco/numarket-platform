import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/guard";
import { PRODUCT_INFO } from "@/lib/nav";

export const metadata: Metadata = { title: "Not in your plan" };

const EXTRA: Record<string, { name: string; about: string; examples: string[] }> = {
  ask: {
    name: "Ask Your Data",
    about: "Type a question in plain English and get an answer from your own numbers, with the definition it used and the rows behind it.",
    examples: ["Which jobs are over budget this month?", "Who owes us more than $100K?", "How did labor cost change since July?"],
  },
  engineering: {
    name: "Engineering",
    about: PRODUCT_INFO.engineering.about,
    examples: ["A crew scheduler that shows labor cost before you commit", "Approved change orders that post to QuickBooks on their own", "A portal your customers sign into to see their job's status"],
  },
  insight: { name: "Insight Review", about: PRODUCT_INFO.insight.about, examples: ["What changed this month, and why", "What's at risk, early", "Recommendations with owners and dates"] },
  foundation: { name: "Foundation", about: PRODUCT_INFO.foundation.about, examples: ["Sources, checks, and flags", "Business definitions", "Your private database"] },
  workspace: { name: "Workspace", about: PRODUCT_INFO.workspace.about, examples: ["Dashboards", "Input screens", "Status reports"] },
};

/* What a product the workspace hasn't bought would add. */
export default async function Available({ params }: { params: Promise<{ product: string }> }) {
  await requireTenant();
  const { product } = await params;
  const p = EXTRA[product];
  if (!p) notFound();
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Not in your plan</p>
          <h1>{p.name}</h1>
        </div>
      </div>
      <div className="available">
        <p style={{ marginTop: 0, fontSize: 16 }}>{p.about}</p>
        <ul>
          {p.examples.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
        <p className="muted small" style={{ marginBottom: 0 }}>
          To add it, talk to your numarket analyst at your next review.
        </p>
      </div>
    </>
  );
}
