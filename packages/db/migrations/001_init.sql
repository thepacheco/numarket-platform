-- numarket Portal control database: initial schema.
--
-- Two kinds of tables:
--   * Platform tables (tenants, hosts, users, staff, sessions): no tenant_id.
--   * Tenant tables: every row has tenant_id. Row-level security is ENABLED and
--     FORCED, and the only policy is "tenant_id = current_tenant()". With no
--     tenant set, every tenant table returns zero rows.
--
-- The web app runs each request as the restricted role portal_app (SET LOCAL
-- ROLE inside a transaction), which owns nothing and can never bypass RLS.
-- tests/isolation.test.ts fails if a tenant table is added without RLS.

-- ---------- roles ----------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'portal_app') then
    create role portal_app nologin;
  end if;
end $$;

grant portal_app to current_user;
grant usage on schema public to portal_app;

-- The tenant for the current transaction, or null when none is set.
create or replace function current_tenant() returns uuid
language sql stable as $$
  select nullif(current_setting('app.tenant_id', true), '')::uuid
$$;

-- ---------- platform tables ----------
create table tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  name text not null,
  tier text not null check (tier in ('insight', 'operate', 'command')),
  products text[] not null default '{foundation,workspace,insight}',
  is_demo boolean not null default false,
  status text not null default 'active' check (status in ('active', 'suspended', 'offboarding')),
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now()
);

-- A configured host that maps straight to one tenant (single-tenant host),
-- used until the wildcard app domain exists. Example: app.numarket.us -> demo.
create table tenant_hosts (
  host text primary key check (host = lower(host)),
  tenant_id uuid not null references tenants (id) on delete cascade
);

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  name text not null,
  title text,
  auth_subject text unique,
  created_at timestamptz not null default now()
);

-- numarket staff. Only these users can reach the ops console.
create table staff (
  user_id uuid primary key references users (id) on delete cascade,
  platform_role text not null check (platform_role in ('platform_admin', 'analyst', 'engineer', 'support', 'billing'))
);

-- Server-side sessions. The cookie holds a random token; only its SHA-256 is stored.
create table sessions (
  id_hash text primary key,
  user_id uuid not null references users (id) on delete cascade,
  surface text not null check (surface in ('tenant', 'ops')),
  tenant_id uuid references tenants (id) on delete cascade,
  method text not null check (method in ('demo', 'dev', 'microsoft', 'google', 'password', 'sso')),
  mfa boolean not null default false,
  ip text,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check ((surface = 'tenant') = (tenant_id is not null))
);
create index sessions_user_idx on sessions (user_id);

grant select on tenants, tenant_hosts, users, staff to portal_app;
grant select, insert, update on sessions to portal_app;

-- ---------- tenant tables ----------
create table memberships (
  tenant_id uuid not null references tenants (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'contributor', 'viewer')),
  scope_dimension text,
  scope_values text[],
  status text not null default 'active' check (status in ('active', 'invited', 'pending_approval', 'deactivated')),
  persona text,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id),
  check ((scope_dimension is null) = (scope_values is null))
);

create table security_policies (
  tenant_id uuid primary key references tenants (id) on delete cascade,
  allowed_methods text[] not null default '{microsoft,google,password}',
  require_mfa boolean not null default true,
  allowed_email_domains text[] not null default '{}',
  ip_allowlist text[] not null default '{}',
  session_hours int not null default 12 check (session_hours between 1 and 24),
  idle_minutes int not null default 60 check (idle_minutes between 5 and 240),
  export_roles text[] not null default '{owner,admin,editor}',
  require_approval boolean not null default false,
  updated_at timestamptz not null default now()
);

create table branding (
  tenant_id uuid primary key references tenants (id) on delete cascade,
  display_name text not null,
  primary_color text not null default '#22577A' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#38A3A5' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  logo_text text,
  signin_message text,
  report_footer text,
  updated_at timestamptz not null default now()
);

-- Append-only: portal_app may insert and read, never change or delete.
create table audit_log (
  id bigserial primary key,
  tenant_id uuid not null references tenants (id) on delete cascade,
  at timestamptz not null default now(),
  actor_user_id uuid references users (id) on delete set null,
  actor_kind text not null check (actor_kind in ('user', 'staff', 'system', 'demo')),
  action text not null,
  target text,
  detail jsonb not null default '{}',
  ip text
);
create index audit_log_tenant_at_idx on audit_log (tenant_id, at desc);

create table definitions (
  tenant_id uuid not null references tenants (id) on delete cascade,
  key text not null,
  name text not null,
  means text not null,
  formula text not null,
  sources text not null,
  owner text not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, key)
);

create table definition_suggestions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  key text not null,
  body text not null check (length(body) between 1 and 1000),
  suggested_by uuid references users (id) on delete set null,
  at timestamptz not null default now()
);

create table refresh_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  kind text not null check (kind in ('scheduled', 'manual', 'reset')),
  triggered_by uuid references users (id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  entries_applied int not null default 0,
  rows_published int not null default 0,
  snowflake_credits numeric(10, 4) not null default 0,
  status text not null default 'succeeded' check (status in ('running', 'succeeded', 'failed'))
);
create index refresh_runs_tenant_idx on refresh_runs (tenant_id, started_at desc);

-- Published serving snapshots. Dashboards, reports, and exports read these and
-- never the warehouse. Append-only for portal_app; history backs published reports.
create table snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  version int not null,
  published_at timestamptz not null default now(),
  datasets jsonb not null,
  refresh_run_id uuid references refresh_runs (id) on delete set null,
  unique (tenant_id, version)
);

create table dashboards (
  tenant_id uuid not null references tenants (id) on delete cascade,
  slug text not null,
  title text not null,
  description text not null default '',
  layout jsonb not null,
  sort int not null default 0,
  primary key (tenant_id, slug)
);

create table input_screens (
  tenant_id uuid not null references tenants (id) on delete cascade,
  slug text not null,
  title text not null,
  description text not null default '',
  fields jsonb not null,
  sort int not null default 0,
  primary key (tenant_id, slug)
);

create table input_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  screen_slug text not null,
  data jsonb not null,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'applied')),
  applied_in_version int,
  foreign key (tenant_id, screen_slug) references input_screens (tenant_id, slug) on delete cascade
);
create index input_entries_tenant_idx on input_entries (tenant_id, created_at desc);

create table reports (
  tenant_id uuid not null references tenants (id) on delete cascade,
  slug text not null,
  title text not null,
  description text not null default '',
  layout jsonb not null,
  draft jsonb not null default '{}',
  draft_updated_by uuid references users (id) on delete set null,
  draft_updated_at timestamptz,
  sort int not null default 0,
  primary key (tenant_id, slug)
);

create table report_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  report_slug text not null,
  version int not null,
  commentary jsonb not null,
  snapshot_version int not null,
  published_by uuid references users (id) on delete set null,
  published_at timestamptz not null default now(),
  unique (tenant_id, report_slug, version),
  foreign key (tenant_id, report_slug) references reports (tenant_id, slug) on delete cascade
);

create table flags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  title text not null,
  detail text not null,
  source text not null,
  job text,
  severity text not null default 'review' check (severity in ('info', 'review', 'urgent')),
  question text,
  options text[],
  status text not null default 'open' check (status in ('open', 'resolved', 'correct', 'auto_fixed')),
  assigned_to uuid references users (id) on delete set null,
  resolution text,
  resolved_by uuid references users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table flag_comments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  flag_id uuid not null references flags (id) on delete cascade,
  user_id uuid references users (id) on delete set null,
  body text not null check (length(body) between 1 and 1000),
  at timestamptz not null default now()
);

create table sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  provider text not null,
  name text not null,
  tier text not null check (tier in ('A', 'B', 'C', 'internal')),
  connection text not null,
  status text not null check (status in ('healthy', 'reconnect', 'syncing', 'paused')),
  last_sync_at timestamptz,
  next_sync_at timestamptz,
  rows_loaded bigint not null default 0,
  streams text[] not null default '{}',
  sort int not null default 0
);

create table data_checks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  name text not null,
  source text not null,
  status text not null check (status in ('pass', 'warn', 'fail')),
  detail text not null,
  last_run_at timestamptz not null default now()
);

-- ---------- row-level security on every tenant table ----------
do $$
declare t text;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attname = 'tenant_id' and not a.attisdropped
    where n.nspname = 'public' and c.relkind = 'r' and c.relname not in ('tenant_hosts', 'sessions')
  loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format(
      'create policy tenant_isolation on %I using (tenant_id = current_tenant()) with check (tenant_id = current_tenant())', t);
  end loop;
end $$;

-- Users are global identities, but the app may only see the signed-in user and
-- the members of the current tenant. Enabled (not forced) so provisioning
-- scripts running as the owner can create users.
alter table users enable row level security;
create policy users_visible on users for select using (
  id = nullif(current_setting('app.user_id', true), '')::uuid
  or exists (select 1 from memberships m where m.user_id = users.id and m.tenant_id = current_tenant())
);

grant select, insert, update, delete on
  memberships, security_policies, branding, definitions, definition_suggestions,
  refresh_runs, dashboards, input_screens, input_entries, reports, report_versions,
  flags, flag_comments, sources, data_checks
to portal_app;
grant select, insert on audit_log, snapshots to portal_app;
grant usage on all sequences in schema public to portal_app;
