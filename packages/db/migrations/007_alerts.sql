-- Alerts: a person's own rules ("tell me when a job goes over budget",
-- "email me a summary of every job on Mondays"), checked against each update.
-- What fired is kept as a notification, with whether an email went out.

create table alert_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  kind text not null check (kind in ('job_over_budget', 'ar_over_60', 'rfi_waiting', 'cash_below', 'flag_opened', 'weekly_summary')),
  params jsonb not null default '{}',
  email boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index alert_rules_tenant_user_idx on alert_rules (tenant_id, user_id);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  rule_id uuid references alert_rules (id) on delete set null,
  -- one notification per rule and condition, so the same alert isn't repeated every day
  dedupe_key text not null,
  title text not null,
  body text not null,
  link text,
  email_status text not null default 'none' check (email_status in ('none', 'sent', 'failed', 'not_configured')),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (tenant_id, user_id, dedupe_key)
);
create index notifications_user_idx on notifications (tenant_id, user_id, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['alert_rules', 'notifications'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('create policy tenant_isolation on %I using (tenant_id = current_tenant()) with check (tenant_id = current_tenant())', t);
  end loop;
end $$;

grant select, insert, update, delete on alert_rules to portal_app;
grant select, insert, update on notifications to portal_app;
grant select, insert, update, delete on alert_rules, notifications to portal_provisioner;
