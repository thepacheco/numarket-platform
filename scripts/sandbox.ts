/* Prospect sandboxes, for numarket staff.

   From GitHub: Actions → "Sandbox" → Run workflow (fills the SANDBOX_* values).
   Locally:     npm run sandbox -- create --company "Acme Builders" [--days 14]
                npm run sandbox -- list
                npm run sandbox -- extend --short-name acme-builders --days 7
                npm run sandbox -- delete --short-name acme-builders

   Needs DATABASE_URL. The address is {short-name}.<APP_DOMAIN> when APP_DOMAIN
   is set (e.g. numarket.app), or the --address you give (one DNS record and a
   Vercel domain per sandbox until the wildcard domain exists). */
import { appendFileSync } from "node:fs";
import { createSandbox, deleteSandbox, extendSandbox, listSandboxes, SANDBOX_MAX_DAYS } from "@numarket/auth/sandbox";
import { closePool } from "@numarket/db";

if (process.env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const get = (name: string, env: string) => (flag(name) ?? process.env[env] ?? "").trim() || undefined;

const action = (args[0] && !args[0].startsWith("--") ? args[0] : process.env.SANDBOX_ACTION ?? "list").trim();
const appDomain = process.env.APP_DOMAIN?.trim().toLowerCase() || null;
const fmt = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });

function addressFor(slug: string, hosts: string[]) {
  const host = hosts[0] ?? (appDomain ? `${slug}.${appDomain}` : null);
  if (!host) return null;
  return `${host.includes("localhost") ? "http" : "https"}://${host}`;
}

function summary(md: string) {
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
}

async function main() {
  if (action === "create") {
    const company = get("company", "SANDBOX_COMPANY");
    if (!company) throw new Error("Give the prospect's company name (--company).");
    const host = get("address", "SANDBOX_ADDRESS")?.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!host && !appDomain) throw new Error("No address: set APP_DOMAIN (e.g. numarket.app) or give --address (e.g. acme.numarket.us).");
    const s = await createSandbox({
      name: company,
      slug: get("short-name", "SANDBOX_SHORT_NAME"),
      days: Number(get("days", "SANDBOX_DAYS") ?? 14),
      logoText: get("logo", "SANDBOX_LOGO"),
      color: get("color", "SANDBOX_COLOR"),
      host,
    });
    const url = addressFor(s.slug, s.hosts)!;
    summary(
      [
        `## Sandbox ready: ${s.name}`,
        "",
        "| | |",
        "|---|---|",
        `| Address | ${url}/sign-in |`,
        `| Access code | \`${s.code}\` |`,
        `| Open until | ${fmt(s.expiresAt)} (then deleted automatically) |`,
        `| Short name | \`${s.slug}\` (use it to extend or delete) |`,
        "",
        host ? `**One more step:** at IONOS add \`CNAME ${host.split(".")[0]} → cname.vercel-dns.com\`, and in Vercel → numarket-portal → Domains add \`${host}\`.` : "",
        "",
        "### Email to send",
        "",
        "> Here's a private sandbox of the numarket Portal with your company's name on it:",
        `> ${url}/sign-in`,
        `> Access code: ${s.code}`,
        "> Pick a person (owner, project manager, superintendent, or CFO) and click around. It's sample data, so nothing you do affects anything real.",
        `> It stays open until ${fmt(s.expiresAt)}. Your changes are kept until then.`,
      ].join("\n"),
    );
  } else if (action === "list") {
    const rows = await listSandboxes();
    summary(
      rows.length
        ? ["## Sandboxes", "", "| Company | Short name | Address | Open until | Last sign-in | Entries |", "|---|---|---|---|---|---|", ...rows.map((r) => `| ${r.name} | \`${r.slug}\` | ${addressFor(r.slug, r.hosts) ?? "—"} | ${fmt(r.expires_at)}${r.expires_at.getTime() < Date.now() ? " (closed)" : ""} | ${r.last_sign_in ? fmt(r.last_sign_in) : "not yet"} | ${r.entries} |`)].join("\n")
        : "## Sandboxes\n\nNone open.",
    );
  } else if (action === "extend") {
    const slug = get("short-name", "SANDBOX_SHORT_NAME");
    if (!slug) throw new Error("Give the short name (--short-name).");
    const days = Number(get("days", "SANDBOX_DAYS") ?? 7);
    if (!(days >= 1 && days <= SANDBOX_MAX_DAYS)) throw new Error(`Days must be 1–${SANDBOX_MAX_DAYS}.`);
    const r = await extendSandbox(slug, days);
    summary(`## Sandbox extended: \`${slug}\`\n\nNew access code: \`${r.code}\` (the old one no longer works)\n\nOpen until ${fmt(r.expiresAt)}.`);
  } else if (action === "delete") {
    const slug = get("short-name", "SANDBOX_SHORT_NAME");
    if (!slug) throw new Error("Give the short name (--short-name).");
    summary((await deleteSandbox(slug)) ? `## Sandbox deleted: \`${slug}\`\n\nEverything in it is gone.` : `No sandbox called \`${slug}\`.`);
  } else {
    throw new Error(`Unknown action "${action}". Use create, list, extend, or delete.`);
  }
}

main()
  .then(() => closePool())
  .catch(async (e) => {
    console.error((e as Error).message);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Didn't work\n\n${(e as Error).message}\n`);
    await closePool();
    process.exit(1);
  });
