-- 010_colleague_directory_view.sql
-- user_profiles RLS only ever let a row's owner (or an admin) SELECT it, so
-- a regular employee/manager could read their own row and nothing else.
-- Every peer-facing feature that needs to list colleagues (Direct Messages,
-- eventually Kudos) was silently reading back a single-row result for
-- everyone but admins.
--
-- Rather than loosen user_profiles' RLS (which would also expose role,
-- email, status, deletion_reason, deletion_scheduled_at to every peer),
-- expose a narrow, column-limited view. The view is intentionally NOT
-- security_invoker, so it runs with the view owner's privileges and reads
-- past the restrictive base-table RLS on purpose -- it is itself the access
-- boundary, filtering out inactive accounts and admin/it (who are not DM
-- participants; see 009_restrict_dm_admin_it.sql) before anything reaches
-- the client.

CREATE OR REPLACE VIEW public.colleague_directory AS
SELECT
  id,
  full_name,
  avatar,
  profile_image,
  job_title,
  working_hours_start,
  working_hours_end,
  timezone
FROM public.user_profiles
WHERE status = 'active'
  AND role NOT IN ('admin', 'it');

-- 008_grant_table_permissions.sql grants ALL PRIVILEGES on every table (and,
-- via ALTER DEFAULT PRIVILEGES, every future table/view) in this schema to
-- anon AND authenticated, leaning on each table's RLS as the real gate.
-- Views have no RLS of their own, so without an explicit REVOKE here this
-- view -- unauthenticated included -- inherits that same default grant and
-- the employee directory becomes readable with nothing but the public
-- anon key.
REVOKE ALL ON public.colleague_directory FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.colleague_directory TO authenticated;
