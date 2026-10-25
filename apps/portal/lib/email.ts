import "server-only";
import { fmt } from "@numarket/blocks";
import type { Vocab } from "@numarket/db/demo/vocab";
import type { Firing, weeklySummary } from "./alerts";

/* The emails alerts send, and the one function that sends them. Delivery
   uses Resend's HTTP API when RESEND_API_KEY and EMAIL_FROM are set in the
   environment; without them nothing is sent and the Portal says so. */

export const emailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

/* attachments: base64 content, like a chart picture or the rows as a CSV */
export type Email = { to: string; subject: string; html: string; text: string; attachments?: { filename: string; content: string }[] };
export type Brand = { name: string; color: string; url: string };

export async function sendEmail(e: Email): Promise<"sent" | "failed" | "not_configured"> {
  if (!emailConfigured()) return "not_configured";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [e.to], subject: e.subject, html: e.html, text: e.text, ...(e.attachments?.length ? { attachments: e.attachments } : {}) }),
    });
    return r.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function shell(b: Brand, title: string, inner: string, footer: string) {
  return `<!doctype html><html><body style="margin:0;background:#eef1f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b1f2e">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:${esc(b.color)};color:#fff;padding:18px 24px;font-weight:600">${esc(b.name)}</td></tr>
<tr><td style="padding:22px 24px"><h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>${inner}</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #e6eaef;font-size:12px;color:#5b6b78">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

const btn = (href: string, label: string) => `<a href="${esc(href)}" style="display:inline-block;background:#0b1f2e;color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;font-weight:600;font-size:14px">${esc(label)}</a>`;

export function alertEmail(b: Brand, firings: Firing[]): Omit<Email, "to"> {
  const subject = firings.length === 1 ? firings[0].title : `${firings.length} alerts: ${firings[0].title}`;
  const items = firings
    .map((f) => `<div style="padding:12px 14px;border-radius:12px;background:${f.tone === "risk" ? "#fdecec" : "#fff3d6"};margin:0 0 10px"><b>${esc(f.title)}</b><div style="font-size:14px;color:#334;margin-top:3px">${esc(f.body)}</div><div style="margin-top:6px"><a href="${esc(b.url + f.link)}" style="color:#22577a;font-size:13px">Open in the Portal</a></div></div>`)
    .join("");
  const html = shell(b, firings.length === 1 ? "An alert you set up" : `${firings.length} alerts you set up`, items, `You get this because you set up these alerts. Change or turn them off: <a href="${esc(b.url)}/alerts" style="color:#22577a">${esc(b.url.replace(/^https?:\/\//, ""))}/alerts</a>`);
  const text = firings.map((f) => `${f.title}\n${f.body}\n${b.url}${f.link}`).join("\n\n") + `\n\nChange or turn off alerts: ${b.url}/alerts`;
  return { subject, html, text };
}

export function summaryEmail(b: Brand, s: ReturnType<typeof weeklySummary>, v: Vocab, updated: string): Omit<Email, "to"> {
  const subject = `Monday summary: ${s.headline}`;
  const rows = s.jobs
    .map((j) => {
      const tone = j.over > 0 ? "#c0392b" : "#1e7d4f";
      return `<tr><td style="padding:8px 6px;border-bottom:1px solid #eef1f5"><b>${esc(j.name)}</b><div style="font-size:12px;color:#5b6b78">${esc(j.customer)}</div></td>
<td style="padding:8px 6px;border-bottom:1px solid #eef1f5;text-align:right">${fmt(j.pct, "pct")}</td>
<td style="padding:8px 6px;border-bottom:1px solid #eef1f5;text-align:right">${fmt(j.actual, "money")}<div style="font-size:12px;color:#5b6b78">of ${fmt(j.budget, "money")}</div></td>
<td style="padding:8px 6px;border-bottom:1px solid #eef1f5;text-align:right;color:${tone};font-weight:600">${j.over > 0 ? `${fmt(j.over, "money")} over` : "On budget"}</td>
<td style="padding:8px 6px;border-bottom:1px solid #eef1f5;text-align:right">${j.rfis}</td></tr>`;
    })
    .join("");
  const table = `<p style="margin:0 0 14px;font-size:15px">${esc(s.headline)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse">
<tr style="font-size:12px;color:#5b6b78;text-align:right"><td style="text-align:left;padding:0 6px 6px">${esc(v.Job)}</td><td style="padding:0 6px 6px">Complete</td><td style="padding:0 6px 6px">Spent</td><td style="padding:0 6px 6px">Vs. budget for work done</td><td style="padding:0 6px 6px">${esc(v.rfiShort)}</td></tr>
${rows}</table><div style="margin-top:18px">${btn(`${b.url}/dashboards/projects`, `Open the ${v.Jobs} dashboard`)}</div>`;
  const html = shell(b, `Your ${v.jobs} this week`, table, `Numbers as of ${esc(updated)}. You get this every Monday because you set it up: <a href="${esc(b.url)}/alerts" style="color:#22577a">change or turn it off</a>.`);
  const text = `${s.headline}\n\n` + s.jobs.map((j) => `${j.name}: ${fmt(j.pct, "pct")} complete, spent ${fmt(j.actual, "money")} of ${fmt(j.budget, "money")}, ${j.over > 0 ? `${fmt(j.over, "money")} over` : "on budget"}, ${j.rfis} ${v.rfis} open`).join("\n") + `\n\n${b.url}/dashboards/projects`;
  return { subject, html, text };
}

/** A chart someone sent from a dashboard, with a note, a link to the same view, and attachments. */
export function snapshotEmail(b: Brand, s: { from: string; title: string; note: string; view: string; link: string; picture: boolean; rows: number | null }) {
  const bits = [s.picture ? "a picture of the chart" : null, s.rows !== null ? `the ${s.rows} rows behind it (CSV)` : null].filter(Boolean).join(" and ");
  const inner = `${s.note ? `<p style="margin:0 0 12px;padding:12px 14px;background:#f4f6f9;border-radius:10px">${esc(s.note)}</p>` : ""}
<p style="margin:0 0 6px"><b>${esc(s.title)}</b>${s.view ? ` · ${esc(s.view)}` : ""}</p>
${bits ? `<p style="margin:0 0 16px;color:#5b6b78;font-size:14px">Attached: ${esc(bits)}.</p>` : ""}
${btn(s.link, "Open it in the Portal")}`;
  const text = `${s.from} sent you ${s.title}${s.view ? ` (${s.view})` : ""}.\n${s.note ? `\n"${s.note}"\n` : ""}${bits ? `\nAttached: ${bits}.\n` : ""}\nOpen it: ${s.link}`;
  return { subject: `${s.from} sent you: ${s.title}`, html: shell(b, `${s.from} sent you a chart`, inner, "You can see it because you have access to this workspace."), text };
}
