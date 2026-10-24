-- 1) Each workspace belongs to an industry, which decides its words and, for
--    sample workspaces, its sample company. Real workspaces default to the
--    same screens; only the nouns change.
alter table tenants add column industry text not null default 'construction' check (industry in ('construction', 'services'));

-- 2) Business definitions are grouped into sections.
alter table definitions add column category text not null default 'Other';

-- 3) Saved reports: a person's own view of an on-demand report (period, job,
--    grouping), optionally shared with the team.
create table saved_views (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  report_slug text not null,
  name text not null,
  params jsonb not null default '{}',
  shared boolean not null default false,
  created_at timestamptz not null default now()
);
create index saved_views_tenant_idx on saved_views (tenant_id, report_slug);

-- 4) Records kept by Engineering apps (estimates, approvals, scanned forms).
create table app_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  app text not null,
  status text not null default 'open',
  data jsonb not null default '{}',
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index app_records_tenant_app_idx on app_records (tenant_id, app, created_at desc);

-- 5) Where each Insight Review action item stands.
create table action_status (
  tenant_id uuid not null references tenants (id) on delete cascade,
  review_id uuid not null references reviews (id) on delete cascade,
  idx int not null,
  status text not null check (status in ('open', 'in_progress', 'done')),
  updated_by uuid references users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, review_id, idx)
);

do $$
declare t text;
begin
  foreach t in array array['saved_views', 'app_records', 'action_status'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('create policy tenant_isolation on %I using (tenant_id = current_tenant()) with check (tenant_id = current_tenant())', t);
  end loop;
end $$;

grant select, insert, delete on saved_views to portal_app;
grant select, insert, update on app_records, action_status to portal_app;
grant select, insert, update, delete on saved_views, app_records, action_status to portal_provisioner;
