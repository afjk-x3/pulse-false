-- 006_calendar_guard_meeting_updates.sql
ALTER TABLE scheduled_meetings ADD COLUMN description TEXT;

-- Allow organizers to update their own meetings
CREATE POLICY "meetings_update_own"
  ON scheduled_meetings FOR UPDATE
  USING (auth.uid() = organizer_id)
  WITH CHECK (auth.uid() = organizer_id);
