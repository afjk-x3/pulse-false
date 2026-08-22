-- 005_calendar_guard_attendee_visibility.sql
-- Allow users to read a meeting row if their UID is in the attendees JSONB array.
CREATE POLICY "meetings_select_attendee"
  ON scheduled_meetings FOR SELECT
  USING ( attendees ? auth.uid()::text );
