-- One board for everything numarket is working on for a client: changes to
-- dashboards and reports, ideas for new apps, issues (help desk), and
-- improvements. The client adds them and can follow each one; numarket moves
-- them along. Updates are the history on each card: who said what, and when
-- it moved.

create table requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  kind text not null check (kind in ('change', 'app', 'issue', 'improvement')),
  product text not null check (product in ('foundation', 'workspace', 'insight', 'engineering')),
  title text not null check (length(title) between 3 and 140),
  detail text not null default '' check (length(detail) <= 4000),
  status text not null default 'submitted' check (status in ('submitted', 'planned', 'in_progress', 'review', 'done')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  -- where it was asked from, like the dashboard someone was looking at
  link text check (link is null or link like '/%'),
  -- the blocks someone picked for a dashboard change ("sketch, not final")
  sketch jsonb,
  -- numarket's estimate in change hours, or the quote for an Engineering project
  estimate_hours numeric check (estimate_hours is null or estimate_hours >= 0),
  quote_amount numeric check (quote_amount is null or quote_amount >= 0),
  -- the numarket person working on it (a name, not a client user)
  assignee text,
  requested_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  done_at timestamptz
);
create index requests_tenant_status_idx on requests (tenant_id, status, updated_at desc);

create table request_updates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  request_id uuid not null references requests (id) on delete cascade,
  -- a client user, or null for numarket
  user_id uuid references users (id) on delete set null,
  author text not null,
  body text not null check (length(body) between 1 and 4000),
  -- the status the request moved to with this update, if it moved
  status text check (status is null or status in ('submitted', 'planned', 'in_progress', 'review', 'done')),
  created_at timestamptz not null default now()
);
create index request_updates_request_idx on request_updates (tenant_id, request_id, created_at);

do $$
declare t text;
begin
  foreach t in array array['requests', 'request_updates'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('create policy tenant_isolation on %I using (tenant_id = current_tenant()) with check (tenant_id = current_tenant())', t);
  end loop;
end $$;

grant select, insert, update on requests to portal_app;
grant select, insert on request_updates to portal_app;
grant select, insert, update, delete on requests, request_updates to portal_provisioner;
