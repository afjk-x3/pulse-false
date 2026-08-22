-- 007_fix_recursive_policies.sql
-- Fixes the infinite recursion bug in user_profiles RLS policies

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "admins_select_all" ON user_profiles;
DROP POLICY IF EXISTS "admins_insert" ON user_profiles;
DROP POLICY IF EXISTS "admins_update_all" ON user_profiles;
DROP POLICY IF EXISTS "admins_delete" ON user_profiles;

CREATE POLICY "admins_select_all"
  ON user_profiles FOR SELECT
  USING ( public.is_admin() );

CREATE POLICY "admins_insert"
  ON user_profiles FOR INSERT
  WITH CHECK ( public.is_admin() );

CREATE POLICY "admins_update_all"
  ON user_profiles FOR UPDATE
  USING ( public.is_admin() );

CREATE POLICY "admins_delete"
  ON user_profiles FOR DELETE
  USING ( public.is_admin() );
