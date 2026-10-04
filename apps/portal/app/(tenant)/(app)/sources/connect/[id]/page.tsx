import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm, { Submit } from "@/components/ActionForm";
import { connectorById, HOW_LABEL, TIER_ABOUT, TIER_LABEL } from "@/lib/connectors";
import { requireTenant } from "@/lib/guard";
import { connectSource } from "../../../../actions";

export const metadata: Metadata = { title: "Connect a source" };

const STEPS = {
  oauth: (n: string) => [
    `You're sent to ${n} and sign in with your own ${n} account.`,
    `${n} asks you to allow read-only access for numarket. You click Allow. Your password stays with ${n}.`,
    "You choose what to sync. The first copy arrives tonight; after that it updates on your plan's schedule.",
  ],
  folder: (n: string) => [`You share one ${n} folder with numarket, read-only.`, "Files in that folder are copied every night. Excel stops being the place people email around.", "When a file doesn't match what's expected, you see it under Flags."],
  upload: () => ["Download a template.", "Fill it in, or export from your system in that layout.", "Upload it. Every row is checked before anything is added."],
  dbuser: (n: string) => [`Your IT creates a read-only user on ${n} (or a reporting copy of it).`, "numarket connects from one fixed address your IT allows. Nothing else can use that login.", "The tables you choose are copied on your plan's schedule."],
  export: (n: string) => [`${n} sends a scheduled export (nightly is typical) to a secure folder.`, "numarket picks the files up and checks them.", "If an export is missing or malformed, you see it under Flags."],
  custom: () => ["Tell us what the system is in your Readiness Check or to your analyst.", "We find the path: an export, a read-only database login, or a small connector.", "You get a fixed quote before anything is built."],
};

export default async function ConnectOne({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant("sources.view");
  const { id } = await params;
  const c = connectorById(id);
  if (!c) notFound();
  const canConnect = ctx.can("sources.connect");
  const live = c.tier === "A" && (c.how === "oauth" || c.how === "folder");
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            <Link href="/sources/connect">Connect a source</Link> · {c.category}
          </p>
          <h1>{c.name}</h1>
          <p>
            <span className={`pill tier-${c.tier}`}>{TIER_LABEL[c.tier]}</span> {TIER_ABOUT[c.tier]}
          </p>
        </div>
      </div>
      <div className="grid-2" style={{ alignItems: "start" }}>
        <section className="card stack">
          <h2>How it connects</h2>
          <p style={{ margin: 0 }}>{HOW_LABEL[c.how]}.</p>
          <ol className="steps">
            {STEPS[c.how](c.name).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          {c.note && <p className="notice">{c.note}</p>}
        </section>
        <section className="card stack">
          <h2>What comes in</h2>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {c.streams.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="small muted" style={{ margin: 0 }}>
            Read-only. A copy lands in your private database; your {c.name} stays exactly as it is.
          </p>
          {!canConnect ? (
            <p className="notice">An admin connects sources for your workspace.</p>
          ) : live ? (
            <ActionForm action={connectSource}>
              <input type="hidden" name="id" value={c.id} />
              <Submit>{ctx.tenant.isDemo ? `Connect ${c.name} (demo)` : `Continue to ${c.name}`}</Submit>
              {ctx.tenant.isDemo && <p className="small muted" style={{ margin: "8px 0 0" }}>In the demo this skips the {c.name} sign-in and adds the source as if you&apos;d clicked Allow.</p>}
            </ActionForm>
          ) : (
            <p className="notice">{c.tier === "C" ? "Your analyst scopes this with you and sends a quote." : "Your analyst schedules a 30-minute setup with your IT."}</p>
          )}
        </section>
      </div>
    </>
  );
}
