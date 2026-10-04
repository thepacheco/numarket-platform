# numarket Portal

The software numarket clients sign into: dashboards, input screens, reports,
flags, and business definitions on top of each client's private data.
**Private. Never make this repository public.**

The full plan is in [`docs/platform-build-spec.md`](docs/platform-build-spec.md).
What exists today, and what's next, is in [`docs/stage-a.md`](docs/stage-a.md).

## Layout

```
apps/portal          Next.js app: tenant app, tenant admin, ops console
apps/worker          Stage B: pipelines and the only path to Snowflake
packages/db          Postgres schema (row-level security), data access, demo model
packages/auth        Sessions, host -> tenant, roles and permissions, security policy
packages/blocks      Building blocks (KPI, trend, bar, table) rendered from snapshots
packages/metering    Tier limits and update schedules
packages/ui          Tenant theming with contrast-safe colors
packages/snowflake   Stage B
packages/connectors  Stage B
dbt/, infra/, tenants/   Stage B
tests/               Isolation, roles, policy, snapshots, access guards
```

## Run it locally

Needs Node 22 and Postgres 16.

```bash
createdb numarket_platform_dev && createdb numarket_platform_test
npm install
export DATABASE_URL=postgresql://localhost:5432/numarket_platform_dev
npm run db:migrate && npm run db:seed
cp .env.local.example apps/portal/.env.local   # then edit if needed
npm run dev
```

- Demo workspace: http://demo.localhost:3100 (pick a person, no password)
- Second test workspace: http://acme.localhost:3100 (dev sign-in: owner@acme.example)
- Ops console: http://ops.localhost:3100 (dev sign-in: ops@numarket.us)

## Checks

```bash
npm run typecheck
npm test        # uses TEST_DATABASE_URL (default numarket_platform_test), rebuilt every run
```

The tests prove, among other things, that every tenant table has row-level
security forced, that one tenant can't read or write another's rows, that a
session for one tenant is refused on another tenant's address, and that every
page and server action checks access first. CI runs them on every push.

## Rules

- No secrets in the repo, ever. `.env.example` lists names only.
- The web app never talks to Snowflake. Dashboards read published snapshots.
- Every tenant table has `tenant_id`, RLS enabled **and forced**, and a policy.
- Every page, route handler, and server action calls `requireTenant` /
  `tenantOrThrow` (or the staff equivalents) before doing anything.
