-- 1) The Portal is not a messaging or task tool. Flags record what the data
--    says and how it was settled; they don't assign work or hold
--    conversations, so assignment and comments are removed.
drop table if exists flag_comments;
alter table flags drop column if exists assigned_to;

-- 2) Insight Review: the analyst's monthly review, published to the client.
create table reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  period text not null,
  title text not null,
  analyst text not null,
  published_at timestamptz not null default now(),
  content jsonb not null,
  unique (tenant_id, period)
);

-- 3) Each person's own Home page layout.
create table home_layouts (
  tenant_id uuid not null references tenants (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  layout jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

do $$
declare t text;
begin
  foreach t in array array['reviews', 'home_layouts'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('create policy tenant_isolation on %I using (tenant_id = current_tenant()) with check (tenant_id = current_tenant())', t);
  end loop;
end $$;

grant select on reviews to portal_app;
grant select, insert, update, delete on home_layouts to portal_app;
grant select, insert, update, delete on reviews, home_layouts to portal_provisioner;
