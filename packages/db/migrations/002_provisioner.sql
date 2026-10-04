-- Provisioning runs as its own role so row-level security applies to it too.
--
-- The database owner (and, in local development, a Postgres superuser) can
-- bypass RLS. Provisioning, the demo reset, and seeding must never rely on
-- that, so withProvisioner() drops to portal_provisioner: full read/write on
-- the tables, but no BYPASSRLS. Tenant tables still need app.tenant_id set.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'portal_provisioner') then
    create role portal_provisioner nologin;
  end if;
end $$;

grant portal_provisioner to current_user;
grant usage on schema public to portal_provisioner;
grant select, insert, update, delete on all tables in schema public to portal_provisioner;
grant usage on all sequences in schema public to portal_provisioner;

-- users has RLS enabled (not forced); the provisioner manages identities.
create policy users_provision on users for all to portal_provisioner using (true) with check (true);
