# numarket Portal — Platform Build Spec v1.0
**Date:** October 3, 2026 · **Owner:** Brandon · **For:** Claude Code (build) and numarket engineers (operate)
**Reads with:** `operating-decisions-v2.2.md` (scope lines, security layers, Snowflake guardrails) and `site-revisions-v2.1.md` (products, pricing). Where this document conflicts with those on *how the app is built*, this document wins.

**Markers used below**
- **[DECISION]** — Brandon must confirm before build starts.
- **[VERIFY]** — Claude Code must check the vendor's current docs before implementing. Do not rely on this document for vendor-specific limits, prices, or API details.
- **[PROPOSED]** — a recommended number or rule not yet confirmed.

---

## 0. What we are building, in one page

**numarket Portal** is the software clients log into. It is the middle layer between a client's business tools (QuickBooks, Procore, spreadsheets, an ERP) and the client's private Snowflake database. Clients never see Snowflake.

```
Client's tools ──(official read-only connections)──▶ numarket pipelines ──▶ Client's private Snowflake account
                                                                                   │ scheduled publish
                                                                                   ▼
Client's team ◀── numarket Portal (dashboards, input screens, reports, alerts) ◀── Serving snapshots
```

**Three surfaces, one codebase:**
| Surface | Who uses it | URL |
|---|---|---|
| **Tenant app** | The client's staff | `{client}.<app-domain>` |
| **Tenant admin** | The client's admins (users, roles, security, branding) | `{client}.<app-domain>/admin` |
| **Ops console** | numarket staff only (set up and run every client) | `ops.<app-domain>` |

**What this supersedes:** v2.1 planned "Streamlit inside Snowflake first, Portal later." The Portal is now the product from day one. Streamlit is allowed only for internal prototypes that no client sees.

**Three rules the whole build serves**
1. **Viewing a dashboard never wakes Snowflake.** Dashboards read pre-built snapshots. This is what protects margin.
2. **A tenant can never see another tenant's anything.** Isolation is enforced at four layers and tested automatically.
3. **Configure, don't code.** Setting up a new client means filling in configuration, not writing new software. Anything that needs new code is Engineering and is quoted.

**Honest scope note:** this is a real multi-tenant software product. Build the MVP slice in §16 first, run it with a demo tenant and one pilot client, and get an independent security test before any real client data goes in. Do not build every page before client #1.

---

## 1. Domains — what to buy and why

**[DECISION] Buy a separate domain for the app.** Recommended: `numarket.app` (or the closest available). Keep `numarket.us` for the marketing site and email.

Why a separate domain:
- Tenant subdomains need a wildcard (`*.domain`). Vercel issues wildcard certificates when the domain uses **Vercel's nameservers** (or when certificate validation is delegated to Vercel). `numarket.us` DNS lives at IONOS with email on it; moving its nameservers risks breaking email. A fresh domain avoids that.
- Security: Vercel's own multi-tenant guidance says to keep the dashboard and sign-in on a different apex from tenant subdomains when possible, because browsers treat sibling subdomains as one site for cookies.

| Host | Purpose |
|---|---|
| `numarket.us` | Marketing site (existing) |
| `{client}.numarket.app` | Tenant app, one per client |
| `demo.numarket.app` | Demo tenant with sample data (used for all sales demos) |
| `ops.numarket.app` | numarket ops console |
| `auth.numarket.app` | Hosted sign-in pages (auth provider custom domain) |
| `api.numarket.app` | Worker service API (internal, not public UI) |
| `status.numarket.app` | Status page |
| `mail.numarket.app` | Sending domain for transactional email (SPF, DKIM, DMARC) |

**Reserved subdomains** (never assignable to a tenant): `www, app, ops, admin, auth, api, demo, status, mail, docs, help, support, billing, static, cdn, numarket, test, staging`.

**Fallback if no new domain is bought:** `{client}.portal.numarket.us`, with the `_acme-challenge` record for `portal.numarket.us` delegated to Vercel. **[VERIFY]** the current "wildcard domains with an external DNS provider" procedure.

**Client-owned domains** (for example `data.clientco.com`): supported through Vercel's domain API (add domain, verify ownership with a TXT record, certificate issued automatically). Offered on **Command**, or as a paid add-on. **[VERIFY]** Vercel multi-tenant limits and plan requirements.

**Cookie rules (mandatory):** session cookies use the `__Host-` prefix, `Secure`, `HttpOnly`, `Path=/`, `SameSite=Lax`, and **no `Domain` attribute**. Validate `Origin` (or a CSRF token) on every state-changing request.

---

## 2. Repositories

**[DECISION] A new private repo, `numarket-platform`, separate from the website and from `numarket-ops`.**

| Repo | Contents | Visibility |
|---|---|---|
| `numarket-site` (existing) | Marketing website | Private or public |
| `numarket-ops` (existing) | Business docs: pricing, decisions, playbooks | Private |
| **`numarket-platform`** (new) | The Portal, worker, connectors, Snowflake provisioning, dbt | **Private. Never public.** |

```
numarket-platform/
├── apps/
│   ├── portal/               Next.js app: tenant app + tenant admin + ops console
│   └── worker/               Node service: pipelines, Snowflake access, schedules
├── packages/
│   ├── auth/                 Session, tenant resolution, permission checks
│   ├── db/                   Postgres schema, migrations, row-level security
│   ├── snowflake/            The ONLY module allowed to talk to Snowflake
│   ├── connectors/           Connector framework + one folder per source
│   ├── blocks/               Building-block library (dashboard tiles, input forms, report layouts)
│   ├── metering/             Usage and cost tracking
│   └── ui/                   Design system, theming
├── dbt/
│   ├── numarket_core/        Shared models, tests, macros, industry templates
│   └── tenants/<slug>/       Per-client mappings and overrides (config, minimal SQL)
├── tenants/<slug>/custom/    Engineering builds for one client (feature-flagged to that tenant)
├── infra/
│   ├── snowflake/            Account provisioning + bootstrap SQL
│   └── cloud/                Worker, secrets, DNS (infrastructure as code)
├── docs/runbooks/            Client setup, offboarding, incident response
└── .env.example
```

**Rules:** no secrets in the repo, ever. Branch protection on `main`, required review, secret scanning, dependency scanning. Three environments: `dev`, `staging`, `prod`, each with its own database, auth environment, and Snowflake **sandbox** account. Production client data never enters dev or staging.

---

## 3. Architecture

### 3.1 Stack
| Layer | Choice | Notes |
|---|---|---|
| Web app | Next.js (App Router) + TypeScript on Vercel | One app serves all three surfaces |
| UI | Tailwind + a component library (shadcn/ui), charts with ECharts or Recharts | Not Streamlit |
| Control database | Postgres (managed, for example Neon) | Tenants, users, roles, config, snapshots, audit, metering |
| Sign-in | A managed auth provider (default: **WorkOS AuthKit**) | Do not build password storage or MFA ourselves. See §4 |
| Worker | Node/TypeScript service in a container with a **static outbound IP** | Runs pipelines; the only thing that talks to Snowflake |
| Job scheduling | A durable job queue in the worker (for example pg-boss on Postgres, or Inngest) | Per-tenant schedules, retries, concurrency limits |
| Data warehouse | Snowflake, one account per tenant, under numarket's organization | See §8 |
| Transformation | dbt Core, run by the worker | **[VERIFY]** whether Snowflake's native dbt support is a better fit |
| Secrets | A cloud secrets manager + key management service | Tokens and private keys never sit in Postgres in plain text |
| Email | Transactional email provider (Resend or Postmark) | Invites, alerts, scheduled reports |
| Errors and logs | Sentry + structured logs | No client data in logs |

**[DECISION] Cloud for worker and secrets.** Recommended: AWS (Fargate + Secrets Manager + KMS), because it is the smoothest path to SOC 2 later. Simpler alternative: Fly.io or Render for the worker plus a hosted secrets manager.

### 3.2 Two planes
- **Control plane (Postgres):** who the tenants and users are, what they're allowed to do, how each tenant is configured, what the dashboards look like, and the published snapshots that dashboards read.
- **Data plane (Snowflake, per tenant):** the client's actual business data: raw copies, cleaned tables, definitions, history.

### 3.3 The single choke point
`packages/snowflake` inside the **worker** is the only code path to Snowflake. The Next.js app never connects to Snowflake. It reads Postgres and calls the worker's internal API. Reasons:
- one place to enforce cost limits and meter usage;
- one static IP to allow in each Snowflake account's network policy;
- Snowflake private keys never reach the web tier.

### 3.4 Serving snapshots (the cost design)
After each scheduled refresh the worker:
1. loads new data (incremental) → 2. runs dbt (incremental models + tests) → 3. builds small **serve tables** in Snowflake → 4. **publishes snapshots**: reads each dashboard dataset once and stores it in Postgres (`snapshots`, tenant-scoped, versioned) → 5. evaluates alert rules against the new snapshot → 6. records freshness and cost.

Dashboards, reports, exports, and alerts all read the snapshot. **A thousand dashboard views cost zero Snowflake compute.**

Snapshots are client data. They must be tenant-isolated (§5), encrypted at rest, capped in size (aggregates and bounded detail tables, not raw dumps), included in the exit package, and deleted at offboarding.

### 3.5 What can touch Snowflake, and when
| Action | Hits Snowflake? | Control |
|---|---|---|
| View dashboard, report, export | No (snapshot) | — |
| Scheduled refresh | Yes | Per-tier schedule (§9) |
| "Update now" button | Yes | Daily limit per tier, admin-only by default |
| Input-screen save | No (saved to Postgres, batched into Snowflake at next refresh) | — |
| Ask Your Data question | Yes | Monthly quota + per-user rate limit; cached per snapshot version |
| Drill-down beyond the snapshot | Yes | Off by default; counts against the query quota |
| numarket analyst work | Yes | Separate warehouse, metered to the tenant |

**Input screens and "right away":** entries save instantly and appear instantly in that screen's own list. They appear in dashboards at the next update, with a visible note ("3 new entries will appear at the 2:00 PM update") and an **Update now** button for permitted users. This replaces v2.1's wording "shows up right away" for dashboards. Update the website copy to match.

---

## 4. Sign-in, MFA, and single sign-on

### 4.1 Provider
Use a managed auth provider with organizations, per-organization policies, MFA, social sign-in, enterprise SSO (SAML/OIDC), and directory sync. Default: **WorkOS AuthKit**; **[VERIFY]** current features and pricing (enterprise SSO is typically billed per connection per month, which drives the pricing rule in 4.5). Wrap the provider behind `packages/auth` so it can be swapped.

One auth **organization** = one numarket **tenant**.

### 4.2 Sign-in methods
| Method | For whom | Notes |
|---|---|---|
| **Sign in with Microsoft** (OAuth) | Most clients | Free, no setup by the client's IT |
| **Sign in with Google** (OAuth) | Most clients | Same |
| **Email + password with MFA** | Clients without Microsoft/Google work accounts | MFA mandatory for this method. Authenticator app or passkey. No SMS codes by default |
| **Enterprise SSO** (SAML/OIDC: Entra ID, Okta, Google Workspace) | Larger clients whose IT requires it | Per-tenant connection, self-serve setup wizard for their IT. When on, other methods are disabled for that tenant |
| **Directory sync (SCIM)** | Larger clients | Users added/removed automatically from their directory |

**Slack and Teams are not sign-in methods.** They are **notification channels** (alerts and report links posted to a channel). "Sign in with Slack" is deliberately not offered: work identity should come from Microsoft, Google, or the client's SSO.

### 4.3 Tenant security policy (set by the client's admin)
Each tenant has a policy the Portal enforces **in its own middleware on every request**, not only at the sign-in provider:
- Allowed sign-in methods (for example "Microsoft only").
- **Require MFA** for all users (default **on**; can only be turned off by numarket, never by default). For email + password, the Portal's auth provider enforces it. For Microsoft, Google, or enterprise SSO sign-in, the second factor is enforced by the client's own identity provider, so the setup checklist has the client's admin confirm it is switched on there. **[VERIFY]** whether the auth provider can require its own second factor on top of Microsoft/Google sign-in; if it can, offer that as a stricter option.
- **Require SSO.**
- **Allowed email domains** for invitations (for example only `@clientco.com`).
- **IP allowlist** (list of CIDR ranges). This is how a "VPN only" client works: they give their VPN/office egress IPs, and requests from anywhere else are refused with a clear message. Requires the client's VPN to have fixed outbound IPs.
- Session length and idle timeout (defaults: 12-hour session, 60-minute idle; stricter allowed).
- Export controls: allow or block CSV/PDF downloads by role.
- New-user approval: invited users need an admin's approval before first access (optional).

**Step-up:** re-verify MFA before changing security policy, connecting or disconnecting a source, bulk export, role changes, and deleting data.

**Lockout safety:** a tenant must always keep at least one Owner. Changing the IP allowlist or SSO settings shows a confirmation and a 10-minute "undo" window using the current session. numarket Platform Admins can break-glass reset a tenant's policy (logged, client notified).

### 4.4 numarket staff
SSO + MFA always (passkey or hardware key preferred). Staff reach tenants through the ops console. **Impersonation** ("view as this user") requires a reason, is time-limited, shows a banner, is read-only by default, and is written to the tenant's audit log, which the client can see.

### 4.5 Pricing rules that follow from auth **[PROPOSED]**
- Microsoft/Google sign-in, MFA, roles, IP allowlist: included on all tiers.
- Enterprise SSO and directory sync: included on Command; add-on on Operate (priced to cover the per-connection fee plus margin); not offered on Insight.
- Client-owned domain: Command, or add-on.

---

## 5. Tenant isolation (how one client can never see another)

Four independent layers. All four must hold.

1. **Hostname → tenant.** Middleware resolves the tenant from the request host. The signed-in user's organization must match that tenant, or the request is refused. numarket staff are the only users who can hold access to more than one tenant, and only through the ops console.
2. **Postgres row-level security.** Every tenant-owned table has `tenant_id`. RLS policies are enabled and forced; the app sets the tenant for each transaction. Application code never filters by tenant "by hand" as the only protection.
3. **Separate Snowflake account per tenant**, with its own service users and keys. A bug in the Portal cannot cross accounts, because the credentials for tenant A cannot open tenant B's account.
4. **Per-tenant secrets.** Each tenant's source tokens and Snowflake keys are separate secrets, encrypted under a per-tenant key. The worker fetches only the secret for the tenant a job belongs to.

**Automated tests (must exist and run in CI):**
- A user in tenant A requesting any tenant B URL, API route, snapshot ID, file, or export gets 403/404.
- A query run without a tenant set returns zero rows from every tenant-owned table.
- A job for tenant A cannot load tenant B's secrets.
- Cache keys, file paths, and search indexes always include the tenant ID.

**Shared code, separate data.** Connector code, building blocks, and the dbt core package are shared by all tenants. Credentials, configuration, mappings, data, and snapshots are per tenant. Engineering builds for one client live in `tenants/<slug>/custom/` and are feature-flagged to that tenant only.

---

## 6. Roles and permissions

### 6.1 Client roles
| Role | Can do |
|---|---|
| **Owner** | Everything Admin can, plus: security policy, billing contact, delete/export all data request, transfer ownership |
| **Admin** | Manage users and roles, branding, alert rules, report schedules, source connections (connect/reconnect), view audit log and usage |
| **Editor** | Enter and edit data in assigned input screens, edit and publish reports they're permitted on, manage their own alerts |
| **Contributor** | Enter data in assigned input screens only |
| **Viewer** | View dashboards and reports in their data scope |

### 6.2 Permission keys (role = bundle of these; custom roles on Operate and Command)
`dashboard.view` · `dashboard.export` · `report.view` · `report.edit` · `report.publish` · `report.schedule` · `input.submit` · `input.edit_own` · `input.edit_any` · `input.approve` · `alert.manage_own` · `alert.manage_all` · `ask.use` · `definitions.view` · `definitions.suggest` · `flags.view` · `flags.resolve` · `sources.view` · `sources.connect` · `refresh.trigger` · `actions.view` · `actions.update_own` · `actions.manage` · `users.manage` · `roles.manage` · `branding.manage` · `security.manage` · `audit.view` · `usage.view`

Example from Brandon's question: only users with `report.publish` can revise and publish the status report. Others can view it, or draft changes if they have `report.edit`.

### 6.3 Data scopes (who sees which rows)
A user's **scope** limits data by a dimension the tenant chooses: project, region, department, site, or customer. A project manager scoped to "Job 114" sees only Job 114.
- Enforced when reading snapshots: snapshots are published per scope partition, and the server filters by the user's scope. Never trust a scope sent from the browser.
- **Ask Your Data** in the MVP is available only to users with tenant-wide scope. Scoped users get it later, after scoped semantic views exist.

### 6.4 numarket internal roles
| Role | Access |
|---|---|
| Platform Admin | Everything, including tenant creation and break-glass |
| Analyst | Assigned tenants only: configure dashboards, definitions, reviews |
| Engineer | Assigned tenants: connectors, mappings, pipelines |
| Support | Tenant settings and status. **No business data** without impersonation |
| Billing | Plans, usage, invoices. No business data |

All checks are server-side. The UI hides what a user can't do, but hiding is never the control.

---

## 7. Connectors: getting data from the client's tools

### 7.1 Principles
- **Read-only.** Connectors pull copies. Nothing writes back to a client's system. Write-back is always an Engineering project.
- **Official connections.** OAuth or an API key the client issues. numarket never asks for a user's login and password.
- **One numarket developer app per provider, one authorization per tenant.** numarket registers a single app with Intuit (QuickBooks), Procore, Microsoft, Google, and so on. Each client clicks "Connect" and approves it. That produces tokens for that tenant only. A new client does **not** need a new API app. A new *provider* needs one new app registration, once.
- **Tokens:** stored in the secrets manager under the tenant's key. Refreshed automatically. When a refresh fails, the source shows "Reconnect needed," the tenant admin and the numarket engineer are notified, and dashboards show the last good update time.

### 7.2 Catalog tiers
| Tier | What | Price treatment |
|---|---|---|
| **A — Standard** | Sources with a mature API or managed connector that numarket has already built and tested | Included. Counts as one source toward the size limit |
| **B — Supported with setup** | Heavier systems: ERPs, on-premise databases, systems needing a partner approval | Counts as a source **plus a one-time connector setup fee** |
| **C — Custom** | No usable API, proprietary system, or unusual format | **Engineering quote.** Fallback is always scheduled file exports |

**Tier A at launch (build in this order):**
1. File uploads (CSV, Excel) through the Portal
2. SharePoint / OneDrive folder sync
3. Google Drive / Google Sheets sync
4. QuickBooks Online
5. Procore
6. Then by demand: Xero, Sage Intacct, Smartsheet, HubSpot, Salesforce, Stripe, Square, Gusto/ADP

**Tier B:** NetSuite, Microsoft Dynamics 365 Business Central, Sage 100/300, Viewpoint Vista, SAP Business One, Oracle, QuickBooks Desktop, any SQL database (SQL Server, Postgres, MySQL), SFTP drops.

**[VERIFY]** each provider's current developer terms, production-approval process, rate limits, and token lifetimes before building. Intuit in particular requires a production app review and changed its refresh-token policy in late 2025.

### 7.3 "What if the client runs their own ERP?"
Three paths, tried in this order:
1. **The ERP has an API or a managed connector** → Tier B.
2. **Read-only database access.** A read-only user on a reporting replica, reached through an allowlisted IP, an SSH tunnel, or a small numarket agent the client's IT installs inside their network (outbound-only connection). → Tier B.
3. **Scheduled exports.** The ERP writes CSV files nightly to an SFTP folder or SharePoint. → Tier A if the files are stable, Tier C if they need custom parsing.

Never promise "we connect to anything." The promise is: "If your system can export or be read, we can take it. The Readiness Check tells you which path and what it costs."

### 7.4 "Client A uses QuickBooks, client B uses Sage"
Each accounting system is its own connector, built once and reused. Both map into the same **canonical model** (`gl_accounts`, `transactions`, `vendors`, `customers`, `invoices`, `bills`, `jobs`). Dashboards and building blocks read the canonical model, so they work for both clients without change. Per-client differences (their chart of accounts, their job naming) live in that tenant's mapping files.

### 7.5 Build or buy **[DECISION]**
Maintaining connectors is exactly the unpaid labor numarket must avoid. Recommended:
- **Build natively:** files, SharePoint/OneDrive, Google Drive, QuickBooks Online (the highest-volume, simplest sources).
- **Use an embedded data-loading vendor for the long tail** (for example Airbyte's embedded offering or Fivetran's "Powered by" program) behind the same connector interface. **[VERIFY]** pricing model first: per-row pricing can exceed the tier's platform allowance, in which case that source is Tier B with pass-through.

### 7.6 Connector interface (all connectors implement this)
```ts
interface Connector {
  id: string;                        // "quickbooks_online"
  tier: "A" | "B" | "C";
  auth: OAuth2Config | ApiKeyConfig | DbConfig | FileConfig;
  discover(ctx): Promise<Stream[]>;  // what tables/objects exist
  sync(ctx, stream, state): AsyncIterable<Batch>;  // incremental by cursor
  canonicalMappings: Mapping[];      // default mapping to the canonical model
  health(ctx): Promise<HealthStatus>;
}
```
Every sync is **incremental** (only changed records), idempotent, resumable, rate-limit aware, and writes a run record (rows read, rows loaded, duration, errors, Snowflake credits).

---

## 8. Snowflake

### 8.1 Organization and accounts
- numarket holds one Snowflake **organization**. Each tenant gets **its own account**, created by script. **[VERIFY]** the default limit on accounts per organization and request an increase before client 10.
- Edition by tenant: Standard by default; Business Critical for healthcare (HIPAA). **[VERIFY]** which features require Enterprise edition (row access policies and masking policies do, as of this writing), and design so Standard is sufficient: row-level limits are enforced by the Portal, not by Snowflake policies.
- Region: closest to the client; default one US region so numarket's worker IP allowlist stays simple.
- One **sandbox account** for dev/staging/demo.
- "Your platform" clients (Command): the client owns the Snowflake account; numarket's worker gets a service user in it. Everything below still applies, created with their admin's approval.

### 8.2 Layout inside every tenant account (identical everywhere)
```
Database NUMARKET
├── RAW_<source>     exact copies from each source, append/merge, never edited
├── STAGING          typed and renamed
├── CLEAN            canonical model, deduplicated, tested
├── SERVE            small summary tables the snapshots are built from
├── APP              data entered through Portal input screens (batched in)
├── META             business definitions, lineage, data-quality flags, freshness
└── AUDIT            pipeline runs, row counts, test results
```

| Warehouse | Size | Auto-suspend | Used for |
|---|---|---|---|
| `WH_LOAD` | XS | 60 s | Loading |
| `WH_TRANSFORM` | XS (S for Large) | 60 s | dbt |
| `WH_SERVE` | XS | 60 s | Snapshot publish, Ask Your Data, analyst queries |

All warehouses: `AUTO_RESUME = TRUE`, statement timeout set, no multi-cluster.

| Role | Rights |
|---|---|
| `LOADER` | Write `RAW_*` and `APP` only |
| `TRANSFORMER` | Read `RAW_*`, `APP`; write `STAGING`, `CLEAN`, `SERVE`, `META`, `AUDIT` |
| `SERVE_READER` | Read `SERVE` and `META` only (used for snapshots and Ask Your Data) |
| `ANALYST` | Read `CLEAN`, `SERVE`, `META`, `AUDIT`. numarket humans, through SSO |
| `CLIENT_READONLY` | Read `CLEAN`, `SERVE`, `META`. **Not granted by default** (see 8.4) |

Service users (`SVC_LOADER`, `SVC_TRANSFORM`, `SVC_SERVE`): `TYPE = SERVICE`, **key-pair authentication** (Snowflake no longer allows password-only sign-in), keys rotated every 90 days, restricted by a **network policy** to the worker's static IP.

### 8.3 Cost guardrails built into provisioning
- **Resource monitors:** one per warehouse and one for the account, with notify at 70% and 85% and **suspend at 100%** of the tenant's monthly credit budget. The budget comes from the tier allowance in the control database.
- Loads are incremental. Full reloads need a Platform Admin flag.
- dbt models over a row threshold must be incremental; CI fails otherwise.
- No dashboard queries Snowflake. Snapshots only.
- Query tags on every statement (`tenant`, `job`, `feature`) so cost can be attributed.

### 8.4 What clients can and cannot see
| Clients **can** see (in the Portal) | Clients **cannot** see |
|---|---|
| Dashboards, reports, their input data | Snowflake itself: no login, no SQL, no warehouse settings |
| Business definitions for every metric | Raw tables and staging tables |
| When each source last updated, and whether it's healthy | The cleaning code (delivered at exit) |
| Flagged data problems and how to resolve them | Other tenants, in any form |
| Their usage against their allowance (as a percentage) | numarket's Snowflake cost or margin |
| Their audit log (who signed in, who changed what, any numarket access) | Service credentials |

Exception: **Command** clients may be granted `CLIENT_READONLY` for their own analysts, with their own warehouse and budget so their queries don't draw down numarket's allowance.

### 8.5 Provisioning script (`infra/snowflake/provision_tenant.ts`)
Idempotent. Inputs: tenant slug, edition, region, tier. Steps: create account → run bootstrap SQL (database, schemas, warehouses, roles, grants, resource monitors, network policy, query-tag defaults) → create service users and key pairs → store keys in the secrets manager → write account locator and secret references to the control database → run a smoke test (load a row, transform it, read it, confirm isolation) → record the result in the ops console.

---

## 9. Cost control and metering

**The business problem:** the monthly fee is fixed and numarket's cost varies. The platform must make cost predictable, visible, and capped.

### 9.1 Limits by tier **[PROPOSED]**
| | Insight (Small) | Operate (Mid) | Command (Large) |
|---|---|---|---|
| Scheduled refresh | Daily, overnight | Up to hourly, 7am–7pm local, weekdays | Custom |
| "Update now" | 2 per day | 6 per day | Custom |
| Ask Your Data | 200 questions / month | 1,000 / month | Custom |
| Row volume (largest table) | Up to ~5M | Up to ~50M | Scoped |
| Platform allowance | $400 / month | $800 / month | Pass-through + 15% |
| Alert rules | 10 | 50 | Custom |
| Scheduled reports | 5 | 25 | Custom |

More frequent refresh, extra questions, and extra sources are **paid add-ons**, so cost growth always has a price attached.

### 9.2 Metering (`packages/metering`)
Nightly, per tenant: pull Snowflake usage (credits by warehouse and by query tag, storage, AI usage) → convert to dollars → add connector vendor cost and app hosting share → store `cost_daily`. Also count questions asked, refreshes run, rows loaded, active users.

### 9.3 Controls
- At **70%** of allowance: ops console warning.
- At **85%**: email to the tenant Owner and the numarket analyst ("you're approaching your included usage"), as the pricing page promises.
- At **100%**: non-essential features pause (Update now, Ask Your Data, drill-downs). Scheduled refresh continues at the base frequency. Overage billing applies per contract.
- **Margin alarm (internal):** any tenant whose platform cost exceeds **15% of its monthly fee** for two consecutive weeks is flagged in the ops console with the top three cost drivers. This is the standing "data volume and usage check" item in Insight Review (v2.2).
- Per-user rate limit on Ask Your Data. Identical questions against the same snapshot version are answered from cache.

### 9.4 Fixed platform costs (rough estimate, before Snowflake)
Web hosting, control database, worker, secrets, email, monitoring: roughly **$150–$400/month total** at up to ~15 tenants. Enterprise SSO connections and embedded connector vendors are extra and must be passed through or priced in. **[VERIFY]** against current vendor pricing before finalizing margins.

---

## 10. Ask Your Data (the only AI feature; optional)
- Runs through the worker using `SERVE_READER`, against the tenant's **business definitions** (semantic model) in `META`. **[VERIFY]** current Snowflake Cortex Analyst API, model availability by region, and pricing.
- Read-only role, `SERVE` schema only, row limit, statement timeout.
- Every answer shows: the definition used, the data's update time, and the underlying rows or chart, so users can check it.
- Thumbs up/down goes to the analyst queue to improve definitions.
- No client data is sent to any AI service outside the tenant's Snowflake account in the default configuration. If that ever changes, it requires a contract term and a tenant-level opt-in.
- Feature-flagged per tenant. A tenant with it off loses nothing else.

---

## 11. Branding and theming
Per tenant, set by a client Admin with `branding.manage`:
- Logo (light and dark), favicon, display name
- One primary color and one accent (the system derives accessible shades and checks contrast)
- Sign-in page message
- Report header/footer text and logo, including **"prepared for" branding** for reports the client sends to *their* customers
- Email sender name (from numarket's sending domain; a client-owned sending domain is Command/add-on)

Fixed for everyone: layout, typography, component styles, and a small "Powered by numarket" mark (removable on Command). This keeps theming a setting, not a design project.

**Default theme** = numarket brand: navy `#22577A`, teal `#38A3A5`, green `#57CC99`, light green `#80ED99`, mint `#C7F9CC`, ink `#0B1F2E`; DM Sans; white, spacious, 12–16px radius. Light and dark modes.

---

## 12. Screens — every page, grouped by product

**Layout (tenant app):** left navigation, top bar with tenant logo, search, **"Updated [time]" stamp**, notifications, and user menu. Navigation items appear only if the tenant bought that product **and** the user has permission (entitlements × permissions).

### 12.1 Sign-in and account
| Page | Purpose |
|---|---|
| Sign in | Tenant-branded. Shows only the methods the tenant allows |
| MFA enroll / verify | Authenticator app or passkey |
| Accept invitation | Set up account, enroll MFA |
| Blocked by policy | Clear reason: wrong network, method not allowed, awaiting approval |
| My profile | Name, notification preferences, MFA devices, active sessions (sign out others) |

### 12.2 Foundation (the client's view of their data)
| Page | Purpose | Key permission |
|---|---|---|
| **Sources** | Each connected source: status, last update, next update, rows loaded. "Connect a source" wizard (pick from catalog → official sign-in → choose what to sync → done). "Reconnect" when needed | `sources.view` / `sources.connect` |
| **Upload files** | Drag in CSV/Excel. Validates against the expected template, shows row-level errors before accepting | `input.submit` |
| **Data health** | Freshness per source, test results in plain English ("3 of 212 checks need attention"), trend | `flags.view` |
| **Flags** | Queue of data problems: what's wrong, where it came from, suggested fix. Actions: Resolve, Assign, "It's correct," Comment. Fixes to source data are made by the client in their own system | `flags.view` / `flags.resolve` |
| **Definitions** | Every metric: plain-English meaning, formula, sources, owner, last changed. "Suggest a change" sends a request to the analyst | `definitions.view` / `definitions.suggest` |

### 12.3 Workspace
| Page | Purpose | Key permission |
|---|---|---|
| **Home** | Role-based landing: key numbers, my action items, recent alerts, data freshness | — |
| **Dashboards** (list + view) | Built from building blocks. Filters, date ranges, drill to bounded detail, hover for the definition. Reads snapshots only | `dashboard.view` |
| **Input screens** (list + form + my entries) | Forms that replace spreadsheets. Validation, drafts, attachments, optional approval step, edit history. Phone-first | `input.submit` etc. |
| **Reports** (list + view + editor) | Status reports in the client's format. Auto-filled from data, with editable commentary sections. Draft → Publish, version history, PDF export, scheduled email | `report.*` |
| **Alerts** | Rule templates: metric + condition + threshold + who + where (email, Slack, Teams). History of what fired | `alert.manage_*` |
| **Ask Your Data** | Question box, suggested questions, answer with chart and definition, usage meter | `ask.use` |
| **Exports** | Download dashboard data or reports, subject to tenant export policy | `dashboard.export` |

### 12.4 Insight Review
| Page | Purpose | Key permission |
|---|---|---|
| **Reviews** (list + view) | Each review: what changed, what's at risk, recommendations, usage check. Written by the numarket analyst in the ops console | `actions.view` |
| **Action items** | Owner, due date, status, linked metric. Owners update their own. Reminder emails run from a rule | `actions.update_own` / `actions.manage` |
| **Requests** | Ask the analyst a question or request a change. Shows remaining change hours this month. Anything outside scope gets an Engineering quote here | — |

### 12.5 Engineering
| Page | Purpose |
|---|---|
| **Custom apps** | A slot in the navigation where one client's custom builds appear (from `tenants/<slug>/custom/`) |
| **Projects** | Status of active Engineering projects, quotes awaiting approval, deliverables |

### 12.6 Tenant admin (`/admin`)
| Page | Purpose | Permission |
|---|---|---|
| Users | Invite, deactivate, assign role and data scope, bulk invite, see last sign-in and MFA status. Seat count against tier limit | `users.manage` |
| Roles | View built-in roles; create custom roles (Operate, Command) | `roles.manage` |
| Security | The tenant policy from §4.3, with step-up and undo | `security.manage` |
| Single sign-on | Self-serve SSO and directory-sync setup for the client's IT | `security.manage` |
| Branding | §11, with live preview | `branding.manage` |
| Notifications | Connect Slack / Teams channels, default recipients | Admin |
| Audit log | Sign-ins, permission changes, exports, source changes, policy changes, **every numarket staff access**. Filter and export | `audit.view` |
| Usage & plan | Plan, products purchased, users, sources, usage against allowance, question quota | `usage.view` |
| Data & exit | Request a full export; see the exit package contents | Owner |

### 12.7 Ops console (`ops.<app-domain>`, numarket staff only)
| Page | Purpose |
|---|---|
| Tenants | List with health, tier, MRR, cost, margin flag |
| New tenant wizard | Slug, tier, products, edition, region → provisions everything (§13) |
| Tenant detail | Config, entitlements, limits, users (support view), domains |
| Pipelines | Schedules, run history, failures, retry, pause |
| Mapping studio | Map source fields to the canonical model, set matching rules, preview results |
| Definitions editor | Author business definitions and the semantic model |
| Dashboard builder | Assemble dashboards from building blocks, bind to serve tables, set scopes |
| Input & report builder | Configure forms and report layouts from templates |
| Flags queue | Triage flags across assigned tenants |
| Review writer | Draft and publish Insight Reviews and action items |
| Cost & margin | Per-tenant cost, drivers, alarms |
| Connector catalog | Versions, health across tenants, provider outages |
| Audit | Staff actions across tenants, impersonation log |
| Offboarding | Run the exit package and deletion (§13.3) |

---

## 13. Playbook — setting up a client, start to finish

"Every client is different" is handled by **configuration at fixed steps**, not by a different process per client.

### 13.1 What varies per client, and where it lives
| Varies | Where it's set | Who sets it |
|---|---|---|
| Tier, products bought, limits | Tenant record (ops console) | Platform Admin |
| Which sources | Sources page / ops | Client Admin connects; engineer configures |
| Field mappings, matching rules | `dbt/tenants/<slug>/` + mapping studio | Engineer |
| Metric definitions | `META` via definitions editor | Analyst |
| Dashboards, input screens, reports | Building-block configuration | Analyst |
| Users, roles, scopes, security policy | Tenant admin | Client Admin |
| Branding | Tenant admin | Client Admin |
| Anything needing new code | `tenants/<slug>/custom/` | Engineer, **after a signed Engineering quote** |

### 13.2 Setup runbook
**Stage 0 — Before signing (sales)**
1. Readiness Check completed; routing rule applied (digital → Foundation; paper → Engineering first).
2. Source list confirmed, each tagged Tier A/B/C. Row-volume band noted. Special requirements noted: SSO, VPN/IP restriction, HIPAA, client-owned domain, non-US data.
3. Order form states tier, products, sources, limits, add-ons, and any Engineering quote. MSA + DPA signed.

**Stage 1 — Provision (Platform Admin, ~30 minutes, mostly automated)**
4. New tenant wizard: slug, tier, products, edition, region.
5. Script creates the Snowflake account and bootstrap (§8.5); the auth organization; the subdomain; default roles; default theme; resource monitors sized to the tier.
6. Smoke test passes. Assign analyst and engineer.

**Stage 2 — Kickoff (with the client, 1 hour)**
7. Invite the client Owner. They enroll MFA, set the security policy (allowed methods, domains, IP allowlist if required), and upload branding.
8. If they need SSO: their IT completes the self-serve SSO wizard.
9. Owner (or their admin) connects each Tier A source with the "Connect" wizard. Tier B sources: engineer schedules the technical session with their IT.

**Stage 3 — Build (engineer + analyst; 2–10 weeks by size)**
10. First sync of each source. Record row counts and compare with the source's own totals.
11. Map to the canonical model in the mapping studio. Set matching rules (vendor/customer/job name matching).
12. Run tests. Triage flags: auto-fix obvious, queue ambiguous, send client-only questions to the client's Flags page.
13. Write business definitions. Client signs off on the top 10–20 metrics.
14. Build serve tables and assemble dashboards from building blocks. Set data scopes.
15. Configure input screens and the status report layout (using the client's existing report as the spec).
16. Configure alert rules and scheduled reports.
17. Set the refresh schedule for the tier. Confirm one full cycle runs inside the cost budget.

**Stage 4 — Launch (1 week)**
18. Reconciliation sign-off: three key reports match the client's source-of-truth numbers.
19. Client Admin invites users, assigns roles and scopes.
20. 30-minute training. Send the quick-start guide.
21. Turn on schedules. Confirm first automated cycle and first scheduled report.

**Stage 5 — Run (monthly)**
22. Insight Review on schedule, including the usage/volume check.
23. Flags queue cleared weekly. Failed runs handled within the support target.
24. Change requests tracked against included hours. Out-of-scope requests become Engineering quotes in the Requests page.
25. Quarterly: key rotation, access review (staff and client users), restore test.

### 13.3 Offboarding runbook
1. Owner requests exit (or contract ends). Schedules continue until the agreed end date.
2. Generate the exit package: data (Parquet/CSV) → schema → dbt project for this tenant → app configuration and any custom code → business definitions → snapshots.
3. Deliver to the client's cloud storage. Client confirms receipt.
4. Or, if agreed and confirmed with Snowflake, transfer the Snowflake account to the client.
5. Revoke source tokens, delete secrets, delete snapshots and control-plane data, drop the Snowflake account, remove the subdomain and auth organization.
6. Send written deletion confirmation. Keep only billing records and the audit entries required by contract.

---

## 14. The lines: what clients do, what numarket does, what's Engineering

This table is the answer to "where do we give them too much power, and where do we do too much for free."

| Capability | Client self-serve | numarket (included) | Engineering (quoted) |
|---|---|---|---|
| Users, roles, scopes, security policy, branding | ✅ | Help on request | — |
| Connect / reconnect a Tier A source | ✅ | Configure what syncs | — |
| Tier B/C sources | — | — | ✅ setup fee or quote |
| Field mapping, cleaning rules | — | ✅ at setup; changes use change hours | Large re-mapping (new system, acquisition) |
| Business definitions | Suggest | ✅ author and maintain | — |
| Dashboards | Filter, save views, favorites | ✅ assemble from building blocks; changes use change hours | New block types or visuals |
| Input screens | Use | ✅ configure from templates, up to tier limit | New form logic, offline mode, integrations |
| Status reports | Edit commentary, publish, schedule | ✅ configure layout from templates | New layout engine, customer portals |
| **Alerts and reminders** | ✅ create from templates (threshold, schedule, recipients), up to tier limit | Set up the initial set | — |
| **Automations** | ❌ no client-built workflows | — | ✅ anything that acts on another system, chains steps, or runs custom logic |
| Ask Your Data | ✅ within quota | Improve definitions from feedback | Custom AI assistants |
| "Update now" | ✅ within daily limit | — | Near-real-time pipelines |
| Fixing bad source data | ✅ in their own system | Flag it, explain it | Cleanup projects in their system |
| Paper to digital | — | — | ✅ |
| Daily status chasing | — | ❌ not offered in any plan | Labor add-on only if Brandon decides to offer it |
| Write-back to client systems | — | — | ✅ |
| Client-owned domain, enterprise SSO | Configure | Included on Command | Add-on on Operate |

**Rule for automations:** clients configure **rules** (if metric crosses X, notify Y). numarket builds **workflows** (do something in another system, multi-step logic, new code), always as Engineering. The analyst does not build automations for free inside Insight Review.

**Rule for change requests:** the Requests page shows hours remaining. A request estimated above the remaining hours cannot be started until the client approves either next month's hours or a quote. The system enforces this, not the analyst's judgment in the moment.

---

## 15. Security requirements (non-negotiable for build)
- Server-side authorization on every route and API handler; deny by default.
- Postgres RLS forced on all tenant tables; migrations fail if a new tenant table lacks a policy.
- Secrets only in the secrets manager; envelope encryption with per-tenant keys; no secrets in logs, errors, or client bundles.
- Snowflake: key-pair service users, network policy to the worker IP, least-privilege roles, 90-day key rotation.
- Input validation on every boundary (schema validation), parameterized queries only, output encoding, strict Content Security Policy, CSRF protection, rate limiting on sign-in and APIs, file-upload scanning and type checks, size limits.
- **Audit log** (append-only): sign-ins, failed sign-ins, MFA changes, role/scope changes, security policy changes, source connect/disconnect, exports, report publishes, impersonation, staff access, pipeline config changes. Visible to the tenant.
- Backups: Postgres point-in-time recovery; quarterly restore test. Snowflake Time Travel settings documented per edition.
- Monitoring and alerting on auth anomalies, pipeline failures, cost spikes, cross-tenant test failures.
- Dependency and secret scanning in CI; pinned dependencies.
- Incident response runbook; client notification within 72 hours of a confirmed incident (per contract).
- **Independent penetration test before the first real client goes live**, and after major changes.
- Design to SOC 2 controls from the start (access reviews, change management, logging), so the later audit is evidence-gathering, not rework.
- Never store card numbers, Social Security numbers, or health records unless the tenant's contract, edition, and controls cover them. Add a column-level sensitive-data check to ingestion that blocks obvious cases.

---

## 16. Build phases (for Claude Code)

Each phase ends with working software and passing tests. Do not start a phase until the previous one's acceptance checks pass.

**Phase 0 — Skeleton**
Monorepo, environments, CI, Postgres schema with RLS, auth integration, hostname → tenant middleware, `__Host-` cookies, ops console shell, tenant app shell, audit log.
*Accept:* two test tenants exist; all cross-tenant isolation tests pass; sign-in with Microsoft, Google, and email+MFA works on a tenant subdomain.

**Phase 1 — Tenant admin**
Users, invitations, roles, permission checks, data scopes, security policy (methods, MFA, domains, IP allowlist, sessions), branding, audit log viewer.
*Accept:* IP allowlist blocks an outside request; a Viewer cannot reach any admin route or API; lockout protections work.

**Phase 2 — Demo tenant on snapshots (the sales demo)**
Building-block library v1 (KPI tile, trend, bar, table, filter bar), dashboard renderer reading snapshots, sample data for one industry (construction), input screen → entries → "pending" note → simulated update, status report view with PDF export, Flags page with sample flags, Definitions page.
*Accept:* `demo.<app-domain>` runs end to end with **no Snowflake connection at all**. This is the demo Brandon shows prospects.

**Phase 3 — Snowflake provisioning and the worker**
Provisioning script, bootstrap SQL, secrets handling, worker service with static IP, job queue, `packages/snowflake` choke point, query tagging, resource monitors.
*Accept:* one command provisions a sandbox tenant; smoke test passes; the web tier has no Snowflake credentials.

**Phase 4 — Pipelines**
Connector framework; file upload; SharePoint/OneDrive and Google Drive sync; QuickBooks Online (sandbox company first); canonical model in `dbt/numarket_core`; tests → flags; snapshot publishing; freshness; schedules.
*Accept:* a QuickBooks sandbox company flows to a live dashboard on a schedule; a broken token shows "Reconnect needed"; one refresh cycle's cost is recorded.

**Phase 5 — Workspace complete**
Alerts (rules, email, Slack, Teams), report editor and scheduling, exports with policy, "Update now" with limits, Home page, notifications.
*Accept:* limits and export policy are enforced server-side.

**Phase 6 — Metering and cost controls**
Nightly cost pull, allowance thresholds, feature pausing at 100%, margin alarm, Usage & plan page, ops Cost & margin page.
*Accept:* a simulated overage triggers 70/85/100% behavior correctly.

**Phase 7 — Insight Review and Requests**
Review writer, action items with reminders, Requests with change-hour tracking and quote approval.

**Phase 8 — Ops tooling**
Mapping studio, definitions editor, dashboard/input/report builders, pipelines view, offboarding runbook automation.

**Phase 9 — Ask Your Data**
Semantic model from definitions, Cortex integration through the worker, quotas, caching, feedback loop.

**Phase 10 — Enterprise options**
Enterprise SSO and directory-sync wizards, client-owned domains, `CLIENT_READONLY` for Command, Tier B connector agent.

**Before any real client data:** penetration test, restore test, incident runbook, attorney-reviewed MSA/DPA, insurance bound.

**Pilot path:** Phases 0–4 plus the parts of 5 a pilot needs are enough to run one friendly client. Mapping and dashboard configuration can be done by hand in config files until Phase 8 exists.

---

## 17. What Brandon needs to set up (accounts and keys)

Create each under a shared `ops@` or `admin@numarket.us` mailbox, not a personal email, with MFA and a password manager entry.

| # | Account | Why | Gives Claude Code |
|---|---|---|---|
| 1 | **App domain** (e.g. `numarket.app`) | Tenant subdomains | Nameservers pointed to Vercel |
| 2 | **GitHub organization** + private `numarket-platform` repo | Code | Repo access |
| 3 | **Vercel** team (paid plan) | Web hosting, wildcard domain, domain API | `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID` |
| 4 | **Postgres** (e.g. Neon) | Control database | `DATABASE_URL` (per environment) |
| 5 | **Auth provider** (e.g. WorkOS) | Sign-in, MFA, SSO | API key, client ID, webhook secret, cookie password |
| 6 | **Microsoft Entra app registration** | "Sign in with Microsoft" + SharePoint/OneDrive access | Client ID, secret, tenant setting (multi-tenant) |
| 7 | **Google Cloud project** (OAuth consent screen, verified) | "Sign in with Google" + Drive/Sheets access | Client ID, secret |
| 8 | **Snowflake organization** (ORGADMIN enabled) + Partner Network application | Client databases | Org name, admin key pair for provisioning |
| 9 | **Cloud account** for worker + secrets (AWS recommended) | Worker, secrets, keys, static IP | Deploy credentials, region |
| 10 | **Intuit Developer** account + app | QuickBooks Online | Client ID, secret (sandbox first; production needs Intuit's app review) |
| 11 | **Procore Developer** account + app | Procore | Client ID, secret |
| 12 | **Slack app** | Alert notifications | Client ID, secret, signing secret |
| 13 | **Email provider** (Resend/Postmark) + sending domain DNS | Invites, alerts, reports | API key |
| 14 | **Sentry** (or similar) | Error tracking | DSN |
| 15 | **Status page** service | `status.` page | — |
| 16 | **Embedded connector vendor** (only if chosen in §7.5) | Long-tail sources | API key |
| 17 | **Stripe** (optional, later) | Invoicing and card/ACH | Keys |

Teams notifications use an incoming webhook per channel or the Microsoft app from #6. Further providers (Xero, Sage, Salesforce, HubSpot) each need one developer app when that connector is built.

### `.env.example` (names only; values go in the secrets manager and hosting settings)
```
APP_DOMAIN=                      # numarket.app
NODE_ENV=
DATABASE_URL=
AUTH_API_KEY=
AUTH_CLIENT_ID=
AUTH_WEBHOOK_SECRET=
AUTH_COOKIE_PASSWORD=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
VERCEL_TOKEN=
VERCEL_TEAM_ID=
VERCEL_PROJECT_ID=
WORKER_INTERNAL_URL=
WORKER_SHARED_SECRET=            # portal → worker authentication
SECRETS_PROVIDER=                # aws | other
SECRETS_REGION=
KMS_KEY_ID=
SNOWFLAKE_ORG_NAME=
SNOWFLAKE_ORGADMIN_ACCOUNT=
SNOWFLAKE_ORGADMIN_USER=
SNOWFLAKE_ORGADMIN_PRIVATE_KEY_REF=   # reference to secret, not the key
SNOWFLAKE_DEFAULT_REGION=
WORKER_STATIC_IP=
INTUIT_CLIENT_ID=
INTUIT_CLIENT_SECRET=
INTUIT_ENVIRONMENT=              # sandbox | production
PROCORE_CLIENT_ID=
PROCORE_CLIENT_SECRET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
EMAIL_API_KEY=
EMAIL_FROM_DOMAIN=
SENTRY_DSN=
```
Per-tenant secrets (source tokens, tenant Snowflake keys) are **never** environment variables. They are created by the provisioning script and connector flows and stored under the tenant's key.

---

## 18. Website and pricing changes this spec triggers
- [ ] Workspace page: "Entries save instantly and appear in dashboards at the next update, or when you press Update now."
- [ ] Security page: add sign-in options, required MFA, IP restriction ("only from your network or VPN"), audit log the client can read, staff access is logged and visible.
- [ ] Pricing: add the limits table (§9.1) and add-ons: enterprise SSO, client-owned domain, extra refresh frequency, extra questions, Tier B connector setup.
- [ ] Platform page: "You sign in at your own address: yourcompany.numarket.app."
- [ ] Demos: point "See a live demo" at `demo.<app-domain>` once Phase 2 ships.
- [ ] Getting Started: the connector catalog with Tier A / B / C explained in plain language.

---

## 19. Decisions

**Confirmed by Brandon (Oct 4, 2026)**
- **Cloud for the worker and secrets: AWS.**
- **Connectors: build the top few natively, use an embedded vendor for the less common ones.**
- **App domain: to be bought later.** Phases 0–2 (including the demo) run on the hosting provider's default address with a single demo tenant. Wildcard tenant subdomains switch on when the domain is bought; build tenant resolution so it works from either a subdomain or a configured single-tenant host.

**Still open**
1. Which app domain to buy.
2. *(confirmed above)*
3. Auth provider: WorkOS (default) or another, after checking current pricing?
4. *(confirmed above)*
5. Confirm or change the tier limits in §9.1 and the auth add-on rules in §4.5.
6. Tier B connector setup fee: what amount?
7. "Powered by numarket" mark: removable on Command only?
8. Who performs the penetration test before the first real client, and what is the budget?
9. Confirm with Snowflake: organization setup for many client accounts, the account limit, and account transfer at exit.
