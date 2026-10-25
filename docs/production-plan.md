# Production plan: from sales demo to grade A

**As of October 4, 2026.** Owner: Brandon. Builds: Claude Code, working from
`docs/platform-build-spec.md`. This plan turns the spec's phases into an order
of work with a finish line for each step.

---

## Where it stands today (honest scorecard)

"Grade A" means a careful mid-size client's IT person could review it and say
yes, and it runs for months without Brandon babysitting it.

| Area | Today | Why | Grade A means |
|---|---|---|---|
| Demo for selling | **A−** | Every screen works on sample data, by role, on phones, with real PDFs. | Live at app.numarket.us with uptime monitoring. |
| Isolation and access control | **B+** | Row-level security forced and tested, roles and job scopes on the server, policy checks every request, audit log, strict CSP. | Plus real sign-in with MFA, rate limits, a passed penetration test. |
| Sign-in | **D** | Demo one-click only. No real accounts, no invitations. | WorkOS: Microsoft, Google, email + MFA, invitations, enterprise SSO option. |
| The data product (connectors, Snowflake, pipelines) | **F (not built)** | Simulated in the demo. This is Stage B. | Real QuickBooks/Procore/files flowing on a schedule into each client's own Snowflake account, checked, published. |
| Reliability and operations | **C** | CI, migrations, rollback through Vercel. No error tracking, alerts, uptime checks, or tested restore. | Sentry, uptime checks, alerting, restore tested quarterly, runbooks, status page. |
| Quality and testing | **B** | 51 tests in CI, including isolation and access guards. No browser tests. | Plus end-to-end browser tests of the main flows, PDF snapshots, a load test. |
| Usability and accessibility | **B** | Clean, consistent, mobile-safe. Not tested with real users or a screen reader. | Five-person usability test fixed; WCAG 2.1 AA checked; onboarding and empty states. |
| Security program | **D** | Good code habits; no written policies, no pen test, no vendor list. | Policies, incident runbook rehearsed, pen test, vendor list, SOC 2 readiness tool running. |
| Commercial readiness | **C** | Pricing on the website, demo ready. Contracts, insurance, billing not done. | See `docs/selling-checklist.md`. |

**Bottom line:** you can sell **pilots** with the demo now. You can't put a
client's real data in until Phases 2–4 and the "before real data" gate are done.

---

## The order of work

Each phase ends with something working and a check that proves it. Times
assume Brandon part-time on accounts and decisions, and Claude Code building.

### Phase 0. Website and demo live (this week, about 2 hours of Brandon's time)
- [ ] **Publish the new website.** As of October 10, numarket.us still serves the April single-page site from `numarket-technologies/website`; the new site in `thepacheco/numarket-website` has never been deployed. Steps: `docs/operations/README.md` §2-A.
- [ ] Import the Portal repo into Vercel, add Neon, set `DEMO_HOSTS` and `CRON_SECRET`, deploy (README §1).
- [ ] Add `app.numarket.us` in Vercel; add the CNAME at IONOS.
- [ ] **Move the Vercel team to Pro** before using it for sales (the free Hobby plan is for non-commercial use).
- [ ] Point the website's "See a live demo" buttons at `https://app.numarket.us/sign-in`.
- [ ] Free uptime check (e.g. Better Stack or UptimeRobot) on `/sign-in`, alerting your phone.

**Done when:** numarket.us shows the new site with a working Contact form, a
stranger can open app.numarket.us on a phone, pick a person, and download the
weekly report PDF, and the nightly reset ran once.

### Phase 1. Production basics (weeks 1–2)
- [ ] Sentry for errors (server and browser), with alerts to email.
- [ ] Rate limits on sign-in and demo sign-in (Vercel Firewall rule plus an in-app limit), and on uploads and Ask.
- [ ] Neon paid plan with enough point-in-time history (7 days or more); write down the restore steps and do one practice restore into a branch.
- [ ] Preview deployments get their own Neon branch (integration setting).
- [ ] Browser tests (Playwright) in CI for: demo sign-in, a dashboard filter, report design → PDF, upload check → import, Ask, a scoped person can't see other jobs.
- [ ] `security.txt`, a privacy-friendly analytics tool on the demo (which screens prospects open).
- [ ] Dependency and secret scanning in GitHub (Dependabot and secret scanning on).
- [ ] Footer links in the Portal to Terms, Privacy, DPA on the website.

**Done when:** a broken page alerts you within 5 minutes, a bad deploy is
rolled back in one click, and the browser tests block a broken merge.

### Phase 2. Real sign-in and onboarding a workspace (weeks 2–5)
- [ ] WorkOS AuthKit: Microsoft, Google, email + MFA (spec §4). Session handling stays ours.
- [ ] Invitations by email (Postmark or Resend), with the sending domain's SPF, DKIM, and DMARC set at IONOS.
- [ ] Staff sign-in for the ops console with required MFA; turn on `OPS_HOSTS`.
- [ ] Ops console: create a workspace, add its first Owner, set tier and products.
- [ ] Buy `numarket.app`; wildcard domain on Vercel; `{client}.numarket.app` (spec §1).
- [ ] Enterprise SSO (SAML/OIDC) as a paid option through WorkOS.

**Done when:** you can create "Test Co" in the ops console, invite yourself,
sign in with Microsoft and MFA at `testco.numarket.app`, and see an empty
workspace with no access to the demo.

### Phase 3. Snowflake and the worker (weeks 4–8)
- [ ] AWS account (MFA, billing alerts), worker service with a fixed outbound IP, secrets in AWS Secrets Manager with per-client keys (spec §3, §8).
- [ ] Snowflake organization; one script creates a client account with the standard roles, network policy to the worker IP, auto-suspend at 60 seconds, and a spending cap (resource monitor).
- [ ] The web app holds no Snowflake credentials. Only the worker talks to Snowflake.

**Done when:** one command creates a sandbox client account, a smoke test
passes, and the cap stops a runaway query.

### Phase 4. Real data flowing (weeks 6–12)
- [ ] Connector framework with read-only access and "Reconnect needed" handling.
- [ ] File uploads to the worker (the Upload page already validates rows).
- [ ] SharePoint/OneDrive and Google Drive folder sync.
- [ ] QuickBooks Online (Intuit sandbox first, then Intuit's production review, which takes weeks: start it early).
- [ ] Procore (developer app, then their marketplace listing if needed).
- [ ] Cleaning models (dbt) with tests; failed tests become Flags; publish snapshots the dashboards already read.
- [ ] "Update now", schedules by tier, cost per refresh recorded (metering).
- [ ] Connect a source page switches from demo to real sign-ins.

**Done when:** a QuickBooks sandbox company and a Procore sandbox project
update the dashboards on schedule for 7 days with no manual fixes; a revoked
token shows "Reconnect needed"; each refresh's cost is visible.

### Gate: before any real client data (must all be true)
- [ ] Independent penetration test done; every high finding fixed and retested.
- [ ] Restore test done and timed.
- [ ] Incident response runbook written and rehearsed once (who calls whom, the 72-hour client notice).
- [ ] MSA, DPA, order form, privacy policy reviewed by an attorney.
- [ ] Cyber liability and professional liability (E&O) insurance bound.
- [ ] Snowflake Partner Network confirms resale billing and account transfer at exit.
- [ ] Access reviews: who at numarket can reach which client, in writing.

### Phase 5. The pilot client (weeks 10–16)
- [ ] One friendly client, free or discounted, in exchange for a case study.
- [ ] Readiness Check → sources connected → definitions written with them → dashboards and the weekly report configured → 30 days of daily updates.
- [ ] Track your hours per week on the pilot. That number tells you whether the prices on the website hold.

**Done when:** the client uses the weekly report in a real meeting for four
weeks running and agrees to the case study.

### Phase 6. Workspace complete (after the pilot starts)
- [ ] Alerts (rules → email, Teams, Slack).
- [ ] Scheduled report emails (the PDF already exists).
- [ ] Ask Your Data on Snowflake Cortex inside the client's account, using the definitions; quotas and logging.
- [ ] Usage & plan page from real metering; overage behavior at 70/85/100%.
- [ ] Billing: Stripe invoices (or QuickBooks invoicing) tied to the plan.

### Phase 7. Grade A polish (ongoing, first 6 months)
- [ ] Usability test with five real users (owner, PM, superintendent, CFO, admin); fix what they trip on.
- [ ] Accessibility check against WCAG 2.1 AA (keyboard, screen reader, contrast).
- [ ] Help center: short guides for each page, an admin guide, the onboarding checklist.
- [ ] Status page (`status.numarket.app`).
- [ ] SOC 2 readiness tool (Vanta, Drata, or Secureframe) once there are 2–3 paying clients; Type I, then Type II. Don't claim SOC 2 until the report exists.
- [ ] Quarterly: restore test, access review, dependency update day.

---

## Running costs (estimates, check current prices when signing up)

| Item | When | Rough monthly |
|---|---|---|
| Vercel Pro | Phase 0 | about $20 per team member |
| Neon (paid plan for longer restore history) | Phase 1 | about $20–70 |
| Sentry | Phase 1 | free tier, then about $26 |
| Uptime monitor | Phase 0 | free tier |
| WorkOS AuthKit | Phase 2 | free for regular sign-ins at this size; enterprise SSO is billed per connection (pass it on to clients) |
| Email (Postmark or Resend) | Phase 2 | about $15–20 |
| `numarket.app` domain | Phase 2 | about $15–20 per year |
| AWS (worker, secrets, fixed IP) | Phase 3 | about $50–150 |
| Snowflake | Phase 3 | per client, covered by the plan's platform allowance ($400 Small, $800 Mid) |
| Penetration test | Gate | one-time, roughly $5,000–15,000 |
| Attorney review of contracts | Gate | one-time, roughly $2,000–5,000 (from operating decisions §7a) |
| Insurance (cyber + E&O) | Gate | roughly $1,500–4,000 per year for a small firm |
| SOC 2 readiness tool + audit | Phase 7 | roughly $10,000–30,000 per year all-in |

Before the first client: about $100–300 a month plus the one-time gate costs.
One Small client with all three products ($3,000/month) covers the running costs
several times over.

---

## Risks to watch

1. **Snowflake resale terms.** The exit promise (transfer the account) depends on Snowflake. Confirm before any contract says it.
2. **Intuit review time.** QuickBooks production access needs Intuit's app review. Start it in Phase 3, not Phase 4.
3. **Fixed price, variable work.** Track pilot hours. If the pilot needs more than about 10 hours a week of hand work, the price or the scope is wrong.
4. **One person.** Write the runbooks so a contractor could restore service if you're unavailable. Keep a break-glass admin account with MFA in the password manager.
5. **Over-promising AI.** Ask Your Data stays optional, and answers show their source and definition.
