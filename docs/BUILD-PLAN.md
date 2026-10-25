# Build plan: from sales demo to a working business

**October 25, 2026.** Owner: Brandon. Built by Claude Code. This replaces the
old `production-plan.md` and the phase list in the spec (§16). It is **the one
ordered list of what to build next.** The technical detail behind each step is
in [`platform-build-spec.md`](platform-build-spec.md) (section numbers given).
The accounts each step needs are in [`ACCOUNTS.md`](ACCOUNTS.md).

## How Claude Code uses this file

1. Start every session with `CLAUDE.md` (the repo rules), then this file.
2. Work on **the first step that isn't done**. Don't skip ahead.
3. **If a "Needs" item is missing**, don't fake it:
   - Say once exactly which account or key is missing and which variable name
     to add (from `ACCOUNTS.md`).
   - Build the parts that don't depend on it.
4. **One pull request per step** (or per part of a large step).
   - CI must be green before you ask Brandon to merge.
   - Merging to `main` deploys app.numarket.us.
5. Tick the boxes here in the same pull request, and update "Where it stands."

"Done when" is the acceptance test. A step isn't done until someone (Claude
Code or Brandon) has seen it pass.

---

## Where it stands (October 25)

| Area | Grade | Why |
|---|---|---|
| Demo for selling | **A−** | Every screen works on sample data, by role, on phones, with real PDFs. |
| Isolation and access control | **B+** | Each company's data is walled off inside the database, and access is checked by role and job on the server. Audit log. 95 tests. |
| Sign-in | **D** | Demo "pick a person" only. No invitations, passwords, multi-factor, or password reset. |
| The data product (connectors, Snowflake, pipelines) | **F** | Simulated in the demo. Not built. |
| Setting up a client | **D** | No screen to create a workspace and its first owner. No first-sign-in walkthrough. |
| Reliability | **C** | CI and one-click rollback. No error tracking, uptime checks, or tested restore. |
| Security program | **D** | Good habits in the code. No policies, penetration test, or insurance. |
| Commercial | **C+** | Prices fixed and consistent (Oct 25). No contracts, insurance, or billing. |

**You can sell pilots now. You can't hold real client data until Step 9 is done.**

---

## Step 0. Housekeeping (Brandon, about 1 hour)

- [ ] Merge Portal PR #2 (Ask your analyst, no reply-time promises, docs).
- [ ] [`ACCOUNTS.md`](ACCOUNTS.md) Batch 1:
  - password manager
  - GitHub: repos moved into the `numarket-technologies` organization, made
    private, Claude GitHub app installed, GitHub Team
  - Vercel Pro
  - Neon paid plan
  - the client domain
  - uptime monitor
- [ ] Vercel: both projects still deploy from the moved repos. Protect `main`:
  pull request required, and the `test` check must pass.

**Done when:** a Claude Code session can push a branch to both repos in the
organization, and Vercel deploys both from `main`.

## Step 1. Production basics (Claude Code, 1–2 sessions)

**Needs:** `SENTRY_AUTH_TOKEN`; Vercel access; the Neon paid plan.

- [ ] Sentry in the Portal (server and browser) and on the website, with
  alerts to email. No client data in error reports.
- [ ] Rate limits on sign-in and demo sign-in, uploads, Ask, and requests.
- [ ] Neon restore: write down the steps, then do one practice restore into a
  branch.
- [ ] Preview deployments get their own Neon branch, never the production
  database.
- [ ] Browser tests (Playwright) in CI for:
  - demo sign-in
  - a dashboard filter
  - report to PDF
  - upload check to import
  - Ask
  - asking the analyst a question
  - a person limited to one job can't see the others
- [ ] Dependabot; `security.txt`; footer links to Terms and Privacy.

**Done when:** a test error shows in Sentry within 5 minutes, a broken pull
request is blocked by the browser tests, and the restore was practiced and
timed.

## Step 2. Real sign-in (Claude Code, 2–4 sessions). Spec §1, §4.

**Needs:** WorkOS staging keys (`AUTH_API_KEY`, `AUTH_CLIENT_ID`); Google and
Microsoft OAuth clients; the client domain in Vercel.

- [ ] WorkOS AuthKit: email and password, password reset, multi-factor,
  Microsoft and Google buttons.
- [ ] Sessions as spec §1 requires (`__Host-` cookies, CSRF checks).
- [ ] Invitations: an admin invites by email; the invited person sets a
  password and multi-factor and lands in their workspace with their role.
- [ ] Each workspace's security settings (allowed methods, multi-factor
  required, session length) enforced on the server.
- [ ] numarket staff sign-in to the ops console, with multi-factor required;
  `OPS_HOSTS` turned on.
- [ ] Client addresses `{client}.numarketapp.com` (wildcard on Vercel; the
  spec says `numarket.app`, which is registered to someone else unless
  Brandon owns it). The demo stays on app.numarket.us.

**Done when:** Brandon is invited to "Test Co" at `testco.numarketapp.com`. He
sets a password, turns on multi-factor, resets the password, and signs in with
Google. He can't reach the demo or anyone else's workspace. All isolation
tests pass.

## Step 3. Email (Claude Code, with Step 2)

**Needs:** `RESEND_API_KEY`; the sending domain's DNS records (Vercel DNS, so
Claude Code adds them).

- [ ] Invitations, alerts, the Monday summary, reminders, and charts sent to a
  teammate all send real email. The demo still never sends email.

**Done when:** an alert email and the Monday summary land in Brandon's inbox
(not spam), and the email checks (SPF, DKIM, DMARC) pass.

## Step 4. Setting up a client (Claude Code, 1–2 sessions). Spec §12.7, §13.

- [ ] Ops console: **New workspace**, with name, address, industry pack, size,
  products, timezone, and the first Owner's email (who gets an invitation).
- [ ] First sign-in walkthrough: five short stops (Home, your data, dashboards,
  your analyst, requests), and screens that explain themselves while there's
  no data yet.
- [ ] A "Getting started" checklist on the Owner's Home: connect sources,
  invite the team, confirm the definitions, book the kickoff.
- [ ] Logo upload for branding (PNG or JPEG, size-limited). It shows in the
  app, reports, the QBR pack, and emails.
- [ ] Turning off a workspace (the Portal half of the exit; the data half is
  Step 6).

**Done when:** Brandon creates Test Co in the ops console in under 5 minutes,
and the Owner's first sign-in shows the walkthrough and the checklist.

## Step 5. Snowflake and the worker (Claude Code, 3–5 sessions). Spec §3, §8.

**Needs:** AWS keys; Snowflake account, user, and token; Snowflake's
confirmation that the organization admin role is on.

- [ ] AWS, written as code in `infra/`:
  - network with one fixed outbound IP
  - the worker as a container service
  - Secrets Manager and encryption keys
  - logs
  - a budget alarm
- [ ] Job queue for schedules and retries (on Postgres).
- [ ] Snowflake provisioning script (spec §8.5): one account per client, with
  the standard roles and warehouses (60-second auto-suspend), spending caps at
  70%, 85%, and 100%, and a network policy allowing only the worker's IP.
  Plus one sandbox account for Test Co.
- [ ] `packages/snowflake` is the only code that talks to Snowflake. The web
  app holds no Snowflake credentials.

**Done when:** one command creates Test Co's Snowflake account, a smoke test
passes, and the spending cap stops a deliberately runaway query.

## Step 6. Test Co: real data flowing (Claude Code, 4–8 sessions). Spec §7, §3.4.

**Needs:** Intuit and Procore sandbox keys; the Microsoft and Google clients
(for folder sync).

- [ ] Connector framework: read-only, and it shows "Reconnect needed" when a
  connection breaks.
- [ ] Spreadsheet upload goes through the worker into Snowflake.
- [ ] SharePoint/OneDrive and Google Drive folder sync, for Excel budgets.
- [ ] QuickBooks Online (sandbox company) and Procore (sandbox project).
- [ ] Cleaning rules (dbt) for the construction pack. A failed check becomes a
  flag and stops publishing. Clean numbers are published to the Portal.
- [ ] Schedules by size (daily on Small, hourly on Mid), **Update now**, and
  the cost of each update recorded.
- [ ] Test data: Test Co's Excel budgets and QuickBooks sandbox entries,
  generated from the demo's sample generator.
- [ ] The exit export: a client's data in open files (Parquet and CSV), with
  the structure and cleaning rules.

**Done when:**
- Test Co updates on schedule for **7 days with no manual fixes**.
- A changed Excel layout raises a flag instead of publishing.
- A revoked QuickBooks connection shows "Reconnect needed".
- Every update's cost is recorded.

## Step 7. Ask Your Data, for real (Claude Code, 2–3 sessions). Spec §10.

- [ ] Questions go through the worker to Snowflake Cortex in the client's own
  account, using the business definitions.
- [ ] Monthly limits (200 Small, 1,000 Mid), answers cached per update, every
  question logged.

**Done when:** Test Co's questions are answered from its own Snowflake data,
showing where each answer came from, and the monthly limit is enforced.

## Step 8. Usage and billing (Claude Code, 1–2 sessions). Spec §9.

**Needs:** Stripe (restricted key), or the decision to invoice from QuickBooks.

- [ ] Nightly cost pull per client. Usage page from real numbers. Warnings at
  70% and 85% of the allowance.
- [ ] Invoices: setup 50% at signing, 50% at launch; monthly in advance.

**Done when:** a simulated overage triggers both warnings, and an invoice for
Test Co is generated correctly.

## Step 9. The gate before real client data (Brandon and Claude Code)

- [ ] Brandon: attorney-reviewed agreements (MSA, DPA, order form, pilot
  agreement).
- [ ] Brandon: insurance bound (E&O and cyber).
- [ ] Brandon: penetration test booked and done; Claude Code fixes every high
  finding, and the tester rechecks them.
- [ ] Brandon: Snowflake Partner Network confirms billing through numarket
  and account handover at exit.
- [ ] Claude Code: restore test timed; incident runbook written and rehearsed
  once with Brandon; a written list of who can reach which client.

**Done when:** every box above is ticked.

## Step 10. First client (pilot)

- [ ] SOP-02 to SOP-06 in [`operations/sops.md`](operations/sops.md):
  Readiness Check, proposal, signature, kickoff, workspace.
- [ ] Their sources connected: a connector, or their exports to start
  ([`operations/50-day-plan.md`](operations/50-day-plan.md), "The data
  decision").
- [ ] Industry dashboards built if they aren't construction or professional
  services.
- [ ] 30 days of daily updates, and Brandon logs hours every week. That number
  says whether the prices hold.

---

## After the pilot (in order of value)

1. More connectors, as clients need them (Sage, Xero, NetSuite and others).
2. Alerts to Slack and Teams.
3. Enterprise single sign-on through WorkOS.
4. Status page.
5. The Portal ideas already designed in [`portal-v4-flow.md`](portal-v4-flow.md):
   - the "Why" panel on every number (§4.2)
   - a phone-first Home for field staff and the manager's Today list
   - alert history and snooze
   - the data health flow map
   - wall-screen mode

## Running costs

See [`ACCOUNTS.md`](ACCOUNTS.md): about $150–300 a month before the first
client, plus the one-time costs in Step 9.
