-- Data reports: lists people run on demand with their own period, job, and
-- grouping (job cost, change order log, aging, ...). Configured per tenant
-- from building blocks; nobody writes queries.
create table data_reports (
  tenant_id uuid not null references tenants (id) on delete cascade,
  slug text not null,
  title text not null,
  description text not null default '',
  category text not null default 'General',
  definition jsonb not null,
  sort int not null default 0,
  primary key (tenant_id, slug)
);

-- The catalog of the tenant's clean tables (what lives in their private
-- database), so people can see what they have, preview it, and download it.
create table catalog_tables (
  tenant_id uuid not null references tenants (id) on delete cascade,
  dataset text not null,
  name text not null,
  title text not null,
  description text not null,
  grain text not null,
  sources text not null,
  sort int not null default 0,
  primary key (tenant_id, dataset)
);

do $$
declare t text;
begin
  foreach t in array array['data_reports', 'catalog_tables'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('create policy tenant_isolation on %I using (tenant_id = current_tenant()) with check (tenant_id = current_tenant())', t);
  end loop;
end $$;

grant select on data_reports, catalog_tables to portal_app;
grant select, insert, update, delete on data_reports, catalog_tables to portal_provisioner;

-- Reports can now be created and laid out by the client from building blocks.
grant insert, delete on reports to portal_app;
