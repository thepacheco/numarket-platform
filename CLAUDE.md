# numarket-platform: notes for Claude Code

This repo is the numarket Portal (`apps/portal`, live at app.numarket.us) and
the company handbook (`docs/`).

## Start of every session

1. Read [`docs/README.md`](docs/README.md) (the map).
2. Then read [`docs/BUILD-PLAN.md`](docs/BUILD-PLAN.md) and work on the first
   step that isn't done.
3. If a step needs an account or key that's missing (see
   [`docs/ACCOUNTS.md`](docs/ACCOUNTS.md) for the variable names):
   - Say so once, naming the exact variable.
   - Build what doesn't depend on it.
   - Never fake the missing part.
4. Don't add new Portal features ahead of the build plan unless Brandon asks.

## Rules that never bend

- **No secrets in the repo, the chat, or logs.** `.env.example` lists names
  only. Values live in the Claude Code environment, Vercel, or AWS Secrets
  Manager.
- **The web app never talks to Snowflake.** Dashboards read published
  snapshots; only the worker (`packages/snowflake`) touches Snowflake.
- **Every workspace table** has `tenant_id`, row-level security enabled
  **and forced**, and a policy. Queries run through
  `withTenant(tenantId, fn, { userId })`.
- **Every page, route handler, and server action checks access first**
  (`requireTenant` / `tenantOrThrow`). `tests/guards.test.ts` enforces it.
- **Server actions never call `redirect()`.** They return
  `{ redirect: "/path" }`.
- **Migrations only add.** Never edit a migration that has been applied; write
  a new one.
- **Never claim a certification numarket doesn't hold** (SOC 2, HIPAA).
- **No response-time promises** (website decision, October 25).
- **The demo:**
  - uses fictional companies only
  - settings are view-only (`assertNotDemo`)
  - never sends email
- **Prices** come from `docs/product-and-pricing.md`. The website's
  `content/tiers.ts` must match it, and the total is the sum of the products.

## Run it locally

```bash
pg_ctlcluster 16 main start                 # Postgres stops when the container restarts
cp .env.local.example apps/portal/.env.local # first time only (git-ignored)
set -a && . apps/portal/.env.local && set +a
npm run db:migrate && npm run db:seed
npm run typecheck && npm test               # what CI runs
npm run dev                                 # http://demo.localhost:3100/sign-in
```

The local database role is `numarket` / `numarket`, with databases
`numarket_platform_dev` and `numarket_platform_test`.

## Branches and releases

- Work on the session's branch.
- Open a pull request; CI (`test`) must be green.
- **Brandon merges. Merging to `main` deploys production**, and the
  production build runs migrations and refreshes the demo.
- Previews don't run migrations.
