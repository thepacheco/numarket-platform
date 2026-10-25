-- Which roles see each dashboard. Null means every role that can see
-- dashboards; owners always see all of them. Set by the workspace's owners
-- and admins under Settings → Roles.
alter table dashboards add column roles text[]
  check (roles is null or roles <@ array['admin', 'editor', 'viewer']::text[]);
