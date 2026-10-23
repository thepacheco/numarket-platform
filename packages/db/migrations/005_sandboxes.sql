-- Prospect sandboxes: a private copy of the demo for one prospect, with their
-- name and branding, behind an access code, deleted after it expires.
-- A sandbox is a demo workspace (is_demo) with an expiry. The public demo has
-- no expiry and is reset nightly; sandboxes keep their changes until deleted.
alter table tenants add column sandbox_expires_at timestamptz;
alter table tenants add column sandbox_code_hash text;
alter table tenants add constraint sandbox_needs_code check (sandbox_expires_at is null or (is_demo and sandbox_code_hash is not null));
