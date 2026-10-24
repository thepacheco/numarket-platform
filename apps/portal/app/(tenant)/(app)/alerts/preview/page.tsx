import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { vocabFor } from "@numarket/db/demo/vocab";
import Icon from "@/components/Icon";
import { kindInfo, weeklySummary } from "@/lib/alerts";
import { syncAlerts, whoFor } from "@/lib/alertsSync";
import { fmtDateTime, workspace } from "@/lib/data";
import { alertEmail, summaryEmail } from "@/lib/email";
import { requireTenant } from "@/lib/guard";

export const metadata: Metadata = { title: "Email preview" };

/* Exactly the email an alert sends, built from today's numbers. */
export default async function EmailPreview({ searchParams }: { searchParams: Promise<{ rule?: string }> }) {
  const ctx = await requireTenant("alert.manage_own");
  const v = vocabFor(ctx.tenant.industry);
  const { rule: id } = await searchParams;
  const { rules, firing } = await syncAlerts(ctx);
  const rule = rules.find((r) => r.id === id);
  if (!rule) notFound();
  const info = kindInfo(rule.kind)!;
  const ws = await workspace(ctx);
  const h = await headers();
  const brand = { name: ws.branding?.display_name ?? ctx.tenant.name, color: ws.branding?.primary_color ?? "#22577A", url: `https://${h.get("host") ?? "app.numarket.us"}` };
  const updated = ws.snapshot ? fmtDateTime(ws.snapshot.published_at, ctx.tenant.timezone) : "";
  const f = firing.get(rule.id) ?? [];
  const mail =
    rule.kind === "weekly_summary"
      ? summaryEmail(brand, weeklySummary(ws.snapshot?.datasets ?? {}, whoFor(ctx), v), v, updated)
      : f.length
        ? alertEmail(brand, f)
        : null;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            <Link href="/alerts">Alerts and emails</Link>
          </p>
          <h1>{info.label(v)}</h1>
          <p>{rule.kind === "weekly_summary" ? `What arrives every Monday at 7 AM, with today's numbers.` : f.length ? "The email this alert sends, with today's numbers." : "Nothing to send right now: this alert is all clear. When it finds something, the email lists each item with a link straight to it."}</p>
        </div>
      </div>
      {mail && (
        <div className="email-preview">
          <div className="email-meta small">
            <span>
              <b>To</b> {ctx.user.email}
            </span>
            <span>
              <b>Subject</b> {mail.subject}
            </span>
            {ctx.tenant.isDemo && (
              <span className="pill">
                <Icon name="mail" /> Preview only: the demo doesn&apos;t send email
              </span>
            )}
          </div>
          <iframe title="Email preview" srcDoc={mail.html} sandbox="" className="email-frame" />
        </div>
      )}
    </>
  );
}
