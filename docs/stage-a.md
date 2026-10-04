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

**Revision, October 4 (after Brandon's walkthrough)**
- Navigation follows the products: Foundation, Workspace, Insight Review,
  Engineering. Products not in the plan stay visible, grayed out. Admin pages
  moved into one Settings area.
- Dashboards have pages and filters: Financial overview (Overview, P&L,
  Receivables, Payables) and Projects (Portfolio, Change orders, RFIs, Field
  hours), with period presets, custom ranges, prior-period comparison, and a
  job filter. New blocks: column charts, aging bars, P&L statement, grouped
  tables with totals.
- Home is each person's own page: they pick key numbers, charts, and panels.
- Reports download as a designed PDF (not a printed web page).
- Flags no longer assign work or hold comments: the Portal records answers,
  it is not a messaging or task tool.
- Insight Review pages show the analyst's monthly review, computed from the
  same published data as the dashboards.

**Completeness pass, October 4 (second walkthrough)**
- Menu: each product is headed by its shape and color from the marketing site
  (Foundation cube, Workspace dodecahedron, Insight Review octahedron,
  Engineering icosahedron), with plain sub-items as in Snowflake's console.
  Products not in the plan are gray with "Not in plan". The desktop menu
  collapses to icons; on phones it opens full screen with a Close button and
  closes after each tap.
- Status reports have a structure and a designer: start from a template
  (weekly, owner report for one job, monthly financial, blank), then add,
  remove, reorder, and rename sections (written text, up to four key numbers,
  any chart or table from the dashboards, page breaks). The server re-checks
  every section; a one-job report can't include company-wide numbers. The PDF
  follows the same layout.
- Run a report: nine lists (job cost, change order log, open RFIs, field
  reports, P&L by account, revenue by customer, AR and AP aging, vendor
  spend) with period, job, and grouping, downloadable as CSV or PDF.
- Data tables: the catalog of the client's clean tables in their private
  database, with a preview, column list, and CSV download (scope and export
  policy apply). A page explains read-only access from Excel, Power BI, or
  Tableau, and what the client gets on exit.
- Connect a source: a catalog of 21 connectors by category with tier
  (Standard, Setup required, Custom) and how each connects. The demo adds an
  official-connection source as if the client clicked Allow.
- Upload files: CSV templates per input screen, a check that shows every row
  with its errors before anything is added, then import of the rows that pass
  (accepts job names or codes and US dates).
- Ask Your Data (demo): common question types answered from the published
  data within the person's access, with the definitions used and the update
  time. Every question is in the audit log.
- Fixes: actions no longer redirect on the server (the follow-up render lost
  the workspace host and showed Not found); sign-out is a POST route like
  sign-in; CSV exports keep negative numbers; PDF arrows and minus signs print
  in Helvetica; each deploy refreshes the demo content.

**Demo workspace (Summit Builders, fictional construction company)**
- One-click sign-in as four people: Owner, Project manager (Route 9 Bridge
  only), Superintendent (contributor), CFO (viewer).
- Home, two dashboards, CSV export (policy- and scope-aware), two input
  screens, four status reports including owner reports "prepared for" a
  client's customer (draft → publish → versions → PDF), the report designer,
  Run a report, Data tables, Connect a source, Upload files, Ask Your Data,
  Sources, Data health, Flags (settle, mark correct, reopen), Definitions
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
| Alerts, scheduled report emails | Phase 5 |
| Ask Your Data on Cortex in the client's account (the demo answers set question types) | Phase 9 |
| Real connector sign-ins (OAuth) and folder sync | Stage B, with the worker |
| Read-only BI logins to the client's tables | Stage B, with Snowflake provisioning |
| Metering against real warehouse cost | Phase 6 |
| Insight Review pages, Requests | Phase 7 |
| Mapping studio and builders in the ops console | Phase 8 |
| Penetration test, restore test, incident runbook | Before any real client data |

Local development has a dev sign-in (`ALLOW_DEV_SIGNIN=1`); it is refused in
production by code, not configuration.

## Deploying Stage A (app.numarket.us)

Step by step in the [README](../README.md#1-deploy-to-appnumarketus-first-time-about-15-minutes).
Production builds run `apps/portal/scripts/vercel-build.sh`: migrations and
the demo refresh happen only when `VERCEL_ENV=production`; preview builds
leave the database alone. Migrations and seeding were checked against a fresh
Postgres whose owner is not a superuser (as on Neon).

What comes next, and what's needed to sell: [`production-plan.md`](production-plan.md),
[`selling-checklist.md`](selling-checklist.md).

## Open decisions carried from the spec

Auth provider pricing check (WorkOS), tier limits in §9.1, pen-test vendor and
budget, Snowflake account limits and transfer at exit.
