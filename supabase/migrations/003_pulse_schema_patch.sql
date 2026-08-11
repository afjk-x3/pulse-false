-- ============================================================
-- Pulse: AxionHR Well-Being Guardian (WBG)
-- Schema Patch — Migration 003
-- Supabase (PostgreSQL) | August 2026
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. ALTER TABLE: user_profiles
-- ────────────────────────────────────────────────────────────

ALTER TABLE user_profiles
  ADD COLUMN share_bri_with_manager BOOLEAN NOT NULL DEFAULT FALSE;


-- ────────────────────────────────────────────────────────────
-- 2. ALTER TABLE: admin_configs
-- ────────────────────────────────────────────────────────────

ALTER TABLE admin_configs
  ADD COLUMN webcam_cv_global_disabled BOOLEAN NOT NULL DEFAULT FALSE;


-- ────────────────────────────────────────────────────────────
-- 3. CREATE TABLE: notifications
-- ────────────────────────────────────────────────────────────

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT NOT NULL,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications.
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read.
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- System (any authenticated context) can insert notifications for any user.
CREATE POLICY "notifications_insert_authenticated"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id)
                                       WHERE read = FALSE;
