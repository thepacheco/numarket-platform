# numarket Portal

The software numarket clients sign into: dashboards, status reports, input
screens, uploads, Ask Your Data, flags, and business definitions on top of
each client's private data.

**Private. Never make this repository public.** No secrets in the repo, ever.

| | |
|---|---|
| Production (demo) | https://app.numarket.us (Summit Builders, fictional sample data) |
| Hosting | Vercel project `numarket-portal`, Root Directory `apps/portal`, region `iad1` |
| Database | Neon Postgres (added through Vercel → Storage) |
| Status | Stage A: the Portal and the sales demo. Real client data needs Stage B. See [`docs/stage-a.md`](docs/stage-a.md) |
| The plan to grade A | [`docs/production-plan.md`](docs/production-plan.md) |
| What's needed to sell | [`docs/selling-checklist.md`](docs/selling-checklist.md) |
| Running the business (go-live steps, addresses, accounts, SOPs) | [`docs/operations/`](docs/operations/README.md) |
| Full product spec | [`docs/platform-build-spec.md`](docs/platform-build-spec.md) |

---

## 1. Deploy to app.numarket.us (first time, about 15 minutes)

Everything below is clicked in the Vercel dashboard under the team
**thepacheco's projects**. The repository already holds the build settings
(`apps/portal/vercel.json`), so there is nothing to type in the build fields.

### Step 1. Import the repository
1. Vercel → **Add New… → Project** → import **thepacheco/numarket-platform**.
   If it isn't listed, choose **Adjust GitHub App Permissions** and give
   Vercel access to that one repository.
2. Project name: **numarket-portal**.
3. **Root Directory: `apps/portal`** (click Edit and pick the folder). Leave
   "Include files outside the root directory" on.
4. Framework: Next.js (detected). Leave Build/Install/Output on their defaults;
   `vercel.json` sets the build command.
5. If Vercel deploys right away, the first build fails because there's no
   database yet. That's harmless. Continue with Step 2, then redeploy.

### Step 2. Add the database
1. Project → **Storage → Create Database → Neon (Serverless Postgres)**.
2. Plan: Free is fine for the demo. Region: **Washington, D.C., USA (iad1)**,
   which matches the app's region.
3. Connect it to the project for **Production** (Preview is optional; see
   §4). This adds `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED`
   (direct) automatically.

### Step 3. Environment variables (Project → Settings → Environment Variables)

| Name | Value | Environments |
|---|---|---|
| `DEMO_HOSTS` | `app.numarket.us,numarket-portal.vercel.app` (the second is your project's production `.vercel.app` address, so you can test before DNS is ready; use the exact one Vercel shows) | Production |
| `CRON_SECRET` | a long random string. Make one with `openssl rand -hex 32`. Mark it **Sensitive**. | Production |

Don't set these in production: `ALLOW_DEV_SIGNIN` (the code refuses it in
production anyway), `OPS_HOSTS` (the ops console has no production sign-in
until WorkOS is in), `APP_DOMAIN` (only once `numarket.app` is bought).

### Step 4. Deploy
Deployments → **Redeploy** the latest (or push to `main`). The production
build runs `apps/portal/scripts/vercel-build.sh`, which:
1. applies database migrations (`packages/db/migrations`, once each),
2. creates or refreshes the demo workspace on the hosts in `DEMO_HOSTS`,
3. builds the app.

Open `https://<your-production-address>.vercel.app/sign-in` and pick a person.
You should land on Home.

### Step 5. The domain
1. Project → **Settings → Domains → Add** `app.numarket.us`.
   `numarket.us` is already verified in this Vercel team.
2. At **IONOS** (DNS for numarket.us), add the record Vercel shows. It is
   usually:

   | Type | Host | Points to | TTL |
   |---|---|---|---|
   | CNAME | `app` | `cname.vercel-dns.com` (use the exact value Vercel displays) | 1 hour |

   Don't change the `@` or `www` records: those serve the marketing site on
   GitHub Pages. Email records are untouched.
3. Wait for Vercel to show **Valid Configuration** (minutes to an hour). The
   certificate is issued automatically.

### Step 6. Check it
- `https://app.numarket.us/sign-in` shows the four demo people.
- Sign in as Dana (Owner): Home, Dashboards, Status reports → Weekly status
  report → Download PDF, Run a report, Upload files, Ask Your Data.
- Sign in as Marcus (Project manager): only Route 9 Bridge appears anywhere.
- Project → **Settings → Cron Jobs** lists `/api/cron/demo-reset` daily at
  08:00 UTC. Run it once; it should return `{"reset":1}`.

---

## 2. Day-to-day operations

| Task | How |
|---|---|
| Ship a change | Push to `main`. CI runs typecheck and tests; Vercel builds, migrates, refreshes the demo, and goes live. |
| Preview a change | Push a branch. Vercel builds a preview (no migrations, no seed; see §4). |
| Roll back | Vercel → Deployments → pick the last good one → **Instant Rollback**. Migrations only add things, so the previous code still runs on the newer schema. |
| Reset the demo now | Wait for the nightly cron, redeploy, or Settings → Cron Jobs → Run. |
| Logs and errors | Vercel → Project → **Logs** (filter by Error). Sentry comes in Phase 1 of the plan. |
| Database console | Vercel → Storage → the Neon database → **Open in Neon** → SQL Editor. Workspace tables show 0 rows unless you `select set_config('app.tenant_id', '<tenant uuid>', false);` first: that's row-level security working. |
| Backups | Neon keeps history for point-in-time restore (length depends on the Neon plan). Test a restore before any real client data (plan, Phase 5). |
| Rotate `CRON_SECRET` | Change the variable, redeploy. |
| Add a migration | New file `packages/db/migrations/00N_name.sql`. Only ever add; never edit an applied file. |

### What the nightly job does
`/api/cron/demo-reset` (Vercel Cron, `Authorization: Bearer $CRON_SECRET`)
deletes visitors' entries, reports they created, sources they connected, and
demo sessions, then republishes the sample data. Real (non-demo) workspaces are
never touched by it or by the deploy-time seed.

---

## 3. How it's built

```
apps/portal          Next.js 16 app: tenant app, tenant settings, ops console
packages/db          Postgres schema (row-level security), data access, demo data model
packages/auth        Sessions, host → workspace, roles and permissions, security policy
packages/blocks      Building blocks (KPI, trend, columns, bar, stacked, table, P&L) from snapshots
packages/metering    Tier limits and update schedules
packages/ui          Workspace theming with contrast-safe colors
apps/worker, packages/snowflake, packages/connectors, dbt/, infra/, tenants/   Stage B
tests/               Isolation, roles, policy, snapshots, blocks, uploads, Ask, access guards
```

**Security model in one paragraph.** Every workspace table carries
`tenant_id` with row-level security enabled **and forced**. Each request runs
inside a transaction as the restricted `portal_app` role with `app.tenant_id`
set, so the database itself refuses other workspaces' rows, even if a query is
wrong. Seeding and resets run as `portal_provisioner`, which also can't bypass
RLS. Sessions are random tokens in a `__Host-` cookie; only their SHA-256 is
stored. Every page, route, and server action checks access first
(`tests/guards.test.ts` fails the build otherwise). Workspace security
policies (sign-in methods, MFA, IP allowlist, session length, idle timeout,
export roles) are enforced on every request. Strict CSP with a per-request
nonce, HSTS, and `frame-ancestors 'none'`. The audit log is append-only.

**Data path.** Dashboards, reports, Run a report, and Ask Your Data read
published snapshots in Postgres. They never query the warehouse. In Stage B a
worker builds those snapshots from each client's private Snowflake account.
Today the demo publishes simulated snapshots.

**Things that look odd but are deliberate**
- Server actions never call `redirect()`. Next.js re-renders the target page
  under its own internal host, which loses the workspace. Actions return
  `{ redirect: "/path" }` and the form navigates (`components/ActionForm.tsx`).
  A test enforces this.
- Sign-in and sign-out are POST route handlers with an Origin check, for the
  same reason.
- PDFs use built-in Helvetica, so `components/pdf/text.ts` swaps symbols it
  can't print (▲ ▼ −).

---

## 4. Environments and variables

| Variable | Where | Notes |
|---|---|---|
| `DATABASE_URL` | Vercel (from Neon) | Pooled. Used by the app. |
| `DATABASE_URL_UNPOOLED` | Vercel (from Neon) | Direct. Used by migrations and seed when present. |
| `DEMO_HOSTS` | Vercel | Comma-separated hosts that open the demo workspace. |
| `CRON_SECRET` | Vercel, Sensitive | Guards the nightly reset. |
| `OPS_HOSTS` | later | Hosts for the ops console, once staff sign-in exists. |
| `APP_DOMAIN` | later | `numarket.app` → `{workspace}.numarket.app`. |
| `ALLOW_DEV_SIGNIN` | local only | `1` enables dev sign-in. Refused in production by code. |
| Sign-in, email, Stage B | later | Listed in `.env.example`. |

**Preview deployments.** Only production builds migrate or seed
(`VERCEL_ENV=production`). If you connect the Neon database to Preview too,
previews read the production demo data but can't change the schema. Better:
turn on Neon's "create a branch for each preview" option in the integration
so each preview gets its own copy.

---

## 5. Run it locally

Needs Node 22+ and Postgres 16.

```bash
createdb numarket_platform_dev && createdb numarket_platform_test
npm install
cp .env.local.example apps/portal/.env.local      # DATABASE_URL, DEMO_HOSTS, ALLOW_DEV_SIGNIN=1
set -a; . apps/portal/.env.local; set +a
npm run db:migrate && npm run db:seed
npm run dev
```

- Demo workspace: http://demo.localhost:3100 (pick a person, no password)
- Second test workspace: http://acme.localhost:3100 (dev sign-in: owner@acme.example)
- Ops console: http://ops.localhost:3100 (dev sign-in: ops@numarket.us)

## 6. Checks

```bash
npm run typecheck
npm test        # uses TEST_DATABASE_URL (default numarket_platform_test), rebuilt every run
```

CI (GitHub Actions, Postgres 16) runs both on every push. The tests prove,
among other things, that every workspace table has row-level security forced,
that one workspace can't read or write another's rows, that a session for one
workspace is refused on another's address, that scoped people only see their
jobs, and that every page, route, and action checks access first.

## 7. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Build fails: `DATABASE_URL is not set` | The Neon database isn't connected to Production. Storage → connect, then redeploy. |
| Build fails: `permission denied to grant role "portal_app"` | The roles were created earlier by a different database user. In the Neon SQL editor, as that user: `grant portal_app, portal_provisioner to neondb_owner;` then redeploy. |
| Every page says "There's nothing here" | The address isn't in `DEMO_HOSTS`. Add it and redeploy. |
| Sign-in loops back to the sign-in page | Cookies are `__Host-` and need HTTPS. Use the https address. |
| Cron shows 401 | `CRON_SECRET` missing or changed without a redeploy. |
| Domain stuck on "Invalid Configuration" | The IONOS record doesn't match what Vercel shows, or a conflicting `app` A record exists. Remove it. |

## 8. Rules

- No secrets in the repo. `.env.example` lists names only.
- The web app never talks to Snowflake. Dashboards read published snapshots.
- Every workspace table has `tenant_id`, RLS enabled **and forced**, and a policy.
- Every page, route handler, and server action checks access first.
- Never claim a certification numarket doesn't hold (SOC 2, HIPAA). Demo
  content uses fictional companies only.
