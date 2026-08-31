-- 009_restrict_dm_admin_it.sql
-- Admins/IT are not participants in the peer Direct Messages channel; enforce
-- it at the RLS layer (not just hiding the sidebar link) so a direct
-- Supabase client call can't bypass the restriction.

CREATE OR REPLACE FUNCTION public.is_admin_or_it()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'it')
  );
$$;

DROP POLICY IF EXISTS "Users can view their own direct messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can insert direct messages they send" ON direct_messages;
DROP POLICY IF EXISTS "Users can update their received direct messages to mark as read" ON direct_messages;

CREATE POLICY "Users can view their own direct messages"
    ON direct_messages FOR SELECT
    USING ((auth.uid() = sender_id OR auth.uid() = receiver_id) AND NOT public.is_admin_or_it());

CREATE POLICY "Users can insert direct messages they send"
    ON direct_messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id AND NOT public.is_admin_or_it());

CREATE POLICY "Users can update their received direct messages to mark as read"
    ON direct_messages FOR UPDATE
    USING (auth.uid() = receiver_id AND NOT public.is_admin_or_it());
