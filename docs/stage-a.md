# Stage A: foundation and the sales demo

**Status:** built and tested locally, October 4, 2026.
Covers spec Phase 0 (skeleton), Phase 2 (demo tenant on snapshots), and the
parts of Phase 1 (tenant admin) a demo needs.

## What exists

**Foundation (kept as-is for real clients)**
- Monorepo: `apps/portal` plus `packages/{db,auth,blocks,metering,ui}`.
- Postgres control database. Every tenant table has `tenant_id` with row-level
  security **enabled and forced**. The app runs each request as the restricted
  `portal_app` role; provisioning runs as `portal_provisioner`. Neither can
  bypass RLS, including on a developer's superuser database.
- Host → tenant resolution: a configured host (`app.numarket.us` → demo) or
  `{slug}.<APP_DOMAIN>` once the wildcard domain exists. A session issued for
  one tenant is refused on another tenant's host. Reserved subdomains are never
  assignable.
- Server-side sessions: random token in a `__Host-` cookie (Secure, HttpOnly,
  SameSite=Lax, no Domain); only its SHA-256 is stored.
- Roles and permission keys exactly as in spec §6; data scopes by job,
  enforced on the server, failing closed.
- Tenant security policy enforced on every request: allowed sign-in methods,
  MFA for password sign-in, IP allowlist (IPv4/IPv6), session length, idle
  timeout, export roles. Lockout protection: last Owner can't be removed; an
  allowlist that excludes the person saving it is refused.
- Append-only audit log (the app role can't update or delete it), visible to
  the tenant, including every numarket staff access.
- Strict Content Security Policy with a per-request nonce, plus HSTS,
  frame-ancestors none, nosniff. Server Actions check Origin; sign-in
  endpoints check Origin explicitly.
- Building-block library (KPI, trend, bar, table, filter) rendered on the
  server from snapshots. Hover any number for its business definition.

**Demo workspace (Summit Builders, fictional construction company)**
- One-click sign-in as four people: Owner, Project manager (Route 9 Bridge
  only), Superintendent (contributor), CFO (viewer).
- Home, two dashboards, CSV export (policy- and scope-aware), two input
  screens, the weekly status report and an owner report "prepared for" a
  client's customer (draft → publish → versions → Save as PDF), Sources,
  Data health, Flags (settle, mark correct, assign, comment), Definitions
  (suggest a change).
- Entries save instantly and reach dashboards at the next update. Admins can
  press Update now (daily limit). Scheduled updates are simulated on the tier's
  schedule.
- Admin: Users (role and scope), Roles matrix, Security, Branding (live
  preview), Audit log, Usage & plan. Settings are view-only in the shared demo.
- Resets every night (Vercel Cron) and on demand from the ops console.

**Ops console** (`ops.` host): tenants list, tenant detail (support view, no
business data), Publish now, Reset demo.

## What's deliberately not here yet

| Item | When |
|---|---|
| Real sign-in (Microsoft, Google, email + MFA, SSO) via WorkOS | Before any real user. Needs the WorkOS account. |
| Invitations by email | With the sign-in provider and email provider |
| Worker, Snowflake provisioning, connectors, real pipelines | Stage B (spec Phases 3–4) |
| Alerts, scheduled report emails, Ask Your Data | Phases 5 and 9 |
| Metering against real warehouse cost | Phase 6 |
| Insight Review pages, Requests | Phase 7 |
| Mapping studio and builders in the ops console | Phase 8 |
| Penetration test, restore test, incident runbook | Before any real client data |

Local development has a dev sign-in (`ALLOW_DEV_SIGNIN=1`); it is refused in
production by code, not configuration.

## Deploying Stage A (app.numarket.us)

1. Vercel: new project from this repo, **Root Directory `apps/portal`**.
2. Vercel → Storage → add **Neon Postgres** to the project (sets `DATABASE_URL`).
3. Environment variables (Production): `DEMO_HOSTS=app.numarket.us`,
   `OPS_HOSTS=ops.numarket.us`, `CRON_SECRET=<random>`. Leave
   `ALLOW_DEV_SIGNIN` unset.
4. Domains: add `app.numarket.us` (and `ops.numarket.us` once staff sign-in is
   live). At IONOS, add a CNAME for `app` (and `ops`) pointing to Vercel.
   Email on numarket.us is untouched.
5. The build migrates and seeds the database, so the demo is ready on first
   deploy. When `numarket.app` is bought, set `APP_DOMAIN=numarket.app`, add
   the wildcard domain in Vercel, and add a host row for `demo.numarket.app`.

## Open decisions carried from the spec

Auth provider pricing check (WorkOS), tier limits in §9.1, pen-test vendor and
budget, Snowflake account limits and transfer at exit.
