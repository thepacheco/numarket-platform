# Accounts: everything Brandon creates, in order

**October 25, 2026.** This is your task list. Each account needs your name,
your card, or your acceptance of the service's terms, so only you can create
it. Once one exists, hand Claude Code what the **Give Claude Code** column
says, and Claude Code builds with it. [`BUILD-PLAN.md`](BUILD-PLAN.md) says
which step each account unlocks.

Costs are estimates checked in October 2026. Confirm them when you sign up.

---

## How a company does this (the rules)

1. **The company owns every account.** Sign up with **admin@numarket.us**,
   never a personal email. Pay with the business card.
2. **One password manager** holds every login and every recovery code.
3. **Multi-factor on everything.** Use an authenticator app or a passkey, not
   text messages.
4. **Owner and root logins are for billing and emergencies only.** Day-to-day
   work goes through your normal user, and Claude Code gets its own user that
   you can switch off at any time.
5. **Test and production stay apart:** sandbox accounts, staging keys, and a
   test client ("Test Co") before any real client.
6. **Keys never go in chat, email, or code.** They live in only four places:
   - the Claude Code environment settings
   - Vercel project settings
   - AWS Secrets Manager (Claude Code puts them there)
   - the password manager
7. **Everything in one region: US East (Virginia).** That means Vercel `iad1`,
   Neon Washington D.C., AWS `us-east-1`, and Snowflake on AWS US East
   (N. Virginia). The pieces talk to each other quickly, and there are no
   cross-region transfer fees.

---

## How the pieces fit (so you know why each account exists)

```
numarket.us (IONOS DNS + email)   →  Website            (Vercel)
app.numarket.us, {client}.numarketapp.com → Portal (Vercel)
        Portal  ↔  Neon Postgres   the Portal's own data: people, roles, settings,
                                    requests, audit log, and the published numbers
        Portal  ↔  WorkOS          sign-in, invitations, multi-factor, password reset
        Portal  →  Resend          email: invitations, alerts, the Monday summary
        Portal  →  Sentry          error alerts
Worker (AWS, us-east-1, one fixed IP address)
        → QuickBooks, Procore, SharePoint/OneDrive, Google Drive   (read-only)
        → Snowflake: one private account per client (raw → clean → checked)
        → publishes the clean numbers to Neon → the Portal shows them
Ask Your Data → Snowflake Cortex, inside the client's own Snowflake account
```

**Snowflake or AWS? Both. They do different jobs.**
- **Snowflake** is where each client's data lives and gets cleaned.
- **AWS** runs the small program (the "worker") that pulls data in on a
  schedule, and it keeps the keys safe.
- **Neon** (the database you added through Vercel) stays as the Portal's own
  database. Don't move it into Snowflake. Snowflake charges for every second
  it's awake, so a page view that woke it would cost money and be slower.
  Neon answers small questions instantly.
- Snowflake as a product is mature. *Our* Snowflake setup doesn't exist yet;
  that's Batch 3 below.

---

## How you hand keys to Claude Code

- In Claude Code on the web, open the environment menu in the session's title
  bar → **Edit**.
  - **Environment variables:** add each key with the exact name in the
    **Give Claude Code** column.
  - **Network access:** choose **Full** for build sessions, or add the domains
    listed at the bottom of this page.
- A new session picks up the changes. **Never paste a key into the chat.**
- Production keys (the "live" ones) go into **Vercel → the project → Settings
  → Environment Variables**, or Claude Code copies them there from its
  environment.
- DNS for numarket.us is at IONOS. Claude Code gives you the exact records and
  you add them, because email depends on that domain.

---

## Batch 1: company basics (today or tomorrow, about 2 hours)

| # | Account | What it's for | Cost | Give Claude Code |
|---|---|---|---|---|
| 1 | **Password manager** (1Password or Bitwarden, business plan) | Every login and recovery code | about $4–8/month | nothing |
| 2 | **Business bank account and business card** (skip if done) | Every subscription is paid by the company | usually free | nothing |
| 3 | **GitHub organization `numarket-technologies`** (it already exists). (a) Merge Portal PR #2 first. (b) Transfer `thepacheco/numarket-website` and `thepacheco/numarket-platform` into the organization (Settings → Transfer). (c) Make both **private**. (d) Archive the old `numarket-technologies/website` once numarket.us points at Vercel. (e) Upgrade the organization to **GitHub Team** so `main` can be protected on private repos. | The company owns its code, not your personal account; your personal projects stay where they are | GitHub Team about $4/user/month | Install the **Claude GitHub app** on the organization for both repos |
| 4 | **Vercel Pro** (your team `thepachecos-projects`). Upgrade to Pro; rename the team to numarket. Optional: move your personal projects (orbitguard, nadir) to a personal team. After step 3, check each project's **Settings → Git** still points at the moved repo. | Hosts the website and the Portal; commercial use needs Pro | about $20/month per member | Give the Vercel connector access to the numarket projects (it currently sees only orbitguard and nadir), or create a token: `VERCEL_TOKEN`, plus `VERCEL_TEAM_ID` |
| 5 | **Neon** (already connected through Vercel Storage) → upgrade to a paid plan | The Portal's database, with 7+ days of restore history | about $20/month | nothing (it's `DATABASE_URL` inside Vercel) |
| 6 | **Client-workspace domain.** `numarket.app` is already registered (checked October 25). If it isn't yours, buy **`numarketapp.com`** (available) **through Vercel**, so its DNS lives where Claude Code can manage it. Clients get `summit.numarketapp.com`. | Each client's Portal address; it keeps client sign-ins separate from the website | about $10–20/year | nothing (Vercel holds it) |
| 7 | **Uptime monitor** (Better Stack or UptimeRobot, free) on numarket.us and app.numarket.us/sign-in, alerting your phone | You hear about an outage before a client does | free | nothing |

---

## Batch 2: real sign-in and email (this week). Unlocks Build Steps 2–4.

| # | Account | What it's for | Cost | Give Claude Code |
|---|---|---|---|---|
| 8 | **WorkOS** (AuthKit) | Sign-in, invitations, multi-factor, password reset, the Microsoft and Google buttons, and enterprise single sign-on later | free for normal sign-ins at our size; enterprise single sign-on is billed per connection (our price to clients is $250/month) | Staging keys in the Claude Code environment: `AUTH_API_KEY`, `AUTH_CLIENT_ID`. Production keys go in Vercel later. |
| 9 | **Google Cloud project** (sign in with admin@numarket.us), with an OAuth client for "Sign in with Google" and, later, Google Drive folder sync | Google sign-in; reading a client's shared Drive folder | free | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| 10 | **Microsoft Entra ID** (free; sign up through the Azure portal with admin@numarket.us; Azure asks for a card) with an app registration set to "any organization" | Microsoft sign-in; reading a client's SharePoint or OneDrive folder | free | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` |
| 11 | **Resend** | Sends Portal email: invitations, alerts, the Monday summary, charts people send each other | about $20/month | `RESEND_API_KEY`. Claude Code sets up the sending domain `mail.numarketapp.com` in Vercel DNS. |
| 12 | **Sentry** (organization "numarket", free Developer plan to start) | Tells you within minutes when a page breaks | free, then about $26/month | `SENTRY_AUTH_TOKEN` (an organization token). Claude Code creates the projects. |

---

## Batch 3: the data platform (next 1–2 weeks). Unlocks Build Steps 5–7.

| # | Account | What it's for | Cost | Give Claude Code |
|---|---|---|---|---|
| 13 | **AWS account**, created with admin@numarket.us as root:<br>• multi-factor on root, then never use root day to day<br>• a billing alarm at $100<br>• region `us-east-1`<br>• a normal user for yourself (IAM Identity Center)<br>• a separate **IAM user `claude-builder`** with access keys, using the permission policy Claude Code gives you | Runs the worker, holds every client's keys (Secrets Manager), and gives the one fixed IP address clients' IT can allow | about $50–150/month before clients | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION=us-east-1` |
| 14 | **Snowflake**:<br>• sign up on **AWS, US East (N. Virginia)**, Standard edition<br>• convert the trial to paid (on-demand, card)<br>• ask Snowflake to confirm the **organization admin role (ORGADMIN)** is on, so we can create one account per client<br>• apply to the **Snowflake Partner Network** (free) to get billing-through-us and account handover at exit confirmed | Each client's private database, plus Cortex for Ask Your Data | pay as you go: about $10–150/month per client, inside their usage allowance | `SNOWFLAKE_ACCOUNT` (the account identifier), `SNOWFLAKE_USER` (a user named `CLAUDE_BUILDER`), `SNOWFLAKE_TOKEN` (a programmatic access token for that user; Claude Code walks you through it) |
| 15 | **Intuit Developer** (QuickBooks): create an app, which comes with a sandbox company. **Start the production app review early;** it takes weeks and asks for the privacy policy and terms URLs. | The official QuickBooks Online connection | free | `INTUIT_CLIENT_ID`, `INTUIT_CLIENT_SECRET`, `INTUIT_ENVIRONMENT=sandbox` |
| 16 | **Procore Developer**: create an app with a sandbox | The official Procore connection | free | `PROCORE_CLIENT_ID`, `PROCORE_CLIENT_SECRET` |

The Microsoft and Google accounts from Batch 2 also cover SharePoint,
OneDrive, and Google Drive folder sync, for clients' Excel budgets.

---

## Batch 4: before a client signs (business)

| # | What | Why | Rough cost |
|---|---|---|---|
| 17 | **Attorney** | Master services agreement, data processing addendum, order form, pilot agreement; review the website's Terms and Privacy pages | $2,000–5,000 one time |
| 18 | **Insurance broker**: professional liability (E&O) and cyber | Required before holding client data | $1,500–4,000 a year |
| 19 | **Stripe** (or QuickBooks invoicing) | Invoices and card/ACH payments. Later, give Claude Code `STRIPE_SECRET_KEY` (a restricted key) to automate invoices. | per transaction |
| 20 | **QuickBooks Online** for numarket's own books | Your own clean numbers (clients will ask) | about $35+/month |
| 21 | **E-signature** (Dropbox Sign, DocuSign, or PandaDoc) | Proposals, agreements, order forms | about $15–25/month |
| 22 | **Penetration test vendor** (book 2–3 weeks ahead) | An outside security check before real client data | $5,000–15,000 one time |
| 23 | **CRM** (HubSpot Free) once you pass about 20 open leads; until then, the Google Sheet | Every lead tracked to a next step | free |

## Later (3+ clients)

Help desk (support@), Slack app for alerts (`SLACK_CLIENT_ID`,
`SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`), status page, payroll (Gusto),
and a SOC 2 readiness tool (Vanta, Drata, or Secureframe).

## Already in place

IONOS (numarket.us domain and email), the Google Sheet and Apps Script that
catch website leads, Calendly, the Vercel team, GitHub, and the Neon database.

---

## Running cost before the first client

About **$150–300 a month** (Vercel, Neon, GitHub Team, password manager, Resend,
AWS, a little Snowflake). Plus the one-time "before real data" costs:
attorney, insurance, penetration test. One Small client ($3,000 a month)
covers the monthly costs many times over.

---

## The Claude Code environment, in one place

**Environment variables** (add them as each account is created):

| Name | From | Needed for |
|---|---|---|
| `VERCEL_TOKEN`, `VERCEL_TEAM_ID` | Vercel (#4) | Environment settings, domains, deploy checks (or the Vercel connector) |
| `SENTRY_AUTH_TOKEN` | Sentry (#12) | Step 1 |
| `AUTH_API_KEY`, `AUTH_CLIENT_ID` | WorkOS staging (#8) | Step 2 |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud (#9) | Steps 2 and 6 |
| `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | Microsoft Entra (#10) | Steps 2 and 6 |
| `RESEND_API_KEY` | Resend (#11) | Step 3 |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` | AWS (#13) | Step 5 |
| `SNOWFLAKE_ACCOUNT`, `SNOWFLAKE_USER`, `SNOWFLAKE_TOKEN` | Snowflake (#14) | Step 5 |
| `INTUIT_CLIENT_ID`, `INTUIT_CLIENT_SECRET`, `INTUIT_ENVIRONMENT` | Intuit (#15) | Step 6 |
| `PROCORE_CLIENT_ID`, `PROCORE_CLIENT_SECRET` | Procore (#16) | Step 6 |

**Allowed domains** (only if you don't choose Full network access):
`api.vercel.com`, `*.neon.tech`, `api.workos.com`, `api.resend.com`,
`*.sentry.io`, `*.amazonaws.com`, `*.snowflakecomputing.com`,
`*.intuit.com`, `*.procore.com`, `graph.microsoft.com`,
`login.microsoftonline.com`, `*.googleapis.com`, `api.stripe.com`. Keep
"Allow package managers" ticked.
