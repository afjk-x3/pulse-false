-- 008_grant_table_permissions.sql
-- Grants basic table permissions to PostgREST roles.
-- RLS policies will still enforce row-level access control.

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Ensure future tables also get these permissions automatically (just in case)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO anon, authenticated, service_role;
