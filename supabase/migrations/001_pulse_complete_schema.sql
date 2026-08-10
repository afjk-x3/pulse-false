-- ============================================================
-- Pulse: AxionHR Well-Being Guardian (WBG)
-- Complete Database Schema — Migration 001
-- Supabase (PostgreSQL) | August 2026
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_cron";      -- scheduled background jobs


-- ────────────────────────────────────────────────────────────
-- 2. CUSTOM ENUM TYPES
-- ────────────────────────────────────────────────────────────

CREATE TYPE account_status AS ENUM (
  'active',
  'disabled',
  'pending_deletion_approval',
  'scheduled_for_deletion'
);

CREATE TYPE message_status AS ENUM (
  'queued',
  'delivered',
  'canceled'
);

CREATE TYPE kudos_category AS ENUM (
  'Collaboration',
  'Gratitude',
  'Inspiration'
);


-- ────────────────────────────────────────────────────────────
-- 3. CORE TABLE: user_profiles
-- ────────────────────────────────────────────────────────────

CREATE TABLE user_profiles (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                  TEXT UNIQUE NOT NULL,
  full_name              TEXT NOT NULL,
  role                   TEXT NOT NULL DEFAULT 'employee'
                           CHECK (role IN ('employee', 'manager', 'admin')),

  -- Account Lifecycle
  status                 account_status NOT NULL DEFAULT 'active',
  deletion_reason        TEXT,
  deletion_scheduled_at  TIMESTAMPTZ,

  -- Accessibility Settings
  reading_ruler_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  dyslexic_font_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  high_contrast_enabled  BOOLEAN NOT NULL DEFAULT FALSE,

  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Employees can read and update only their own profile.
CREATE POLICY "users_select_own"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can read all profiles (for provisioning & lifecycle).
CREATE POLICY "admins_select_all"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert new profiles (account provisioning).
CREATE POLICY "admins_insert"
  ON user_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any profile (disable / schedule deletion).
CREATE POLICY "admins_update_all"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can hard-delete profiles.
CREATE POLICY "admins_delete"
  ON user_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ────────────────────────────────────────────────────────────
-- 4. TELEMETRY TABLE: mood_logs
-- ────────────────────────────────────────────────────────────

CREATE TABLE mood_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  mood_score    INTEGER NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
  energy_level  INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;

-- Employees can only read and insert their own mood logs.
CREATE POLICY "mood_select_own"
  ON mood_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "mood_insert_own"
  ON mood_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- 5. PEER TABLE: kudos_posts
-- ────────────────────────────────────────────────────────────

CREATE TABLE kudos_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipient_id  UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  category      kudos_category NOT NULL,
  message       TEXT NOT NULL,
  likes_count   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE kudos_posts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read the kudos feed.
CREATE POLICY "kudos_select_all"
  ON kudos_posts FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Any authenticated user can post a kudos.
CREATE POLICY "kudos_insert_own"
  ON kudos_posts FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Only the sender can delete their own kudos.
CREATE POLICY "kudos_delete_own"
  ON kudos_posts FOR DELETE
  USING (auth.uid() = sender_id);


-- ────────────────────────────────────────────────────────────
-- 6. PEER TABLE: support_circle_messages
-- ────────────────────────────────────────────────────────────

CREATE TABLE support_circle_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  pseudonym_alias TEXT,
  topic_channel   TEXT NOT NULL,
  message         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE support_circle_messages ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read support circle messages.
CREATE POLICY "circles_select_all"
  ON support_circle_messages FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Any authenticated user can post a message.
CREATE POLICY "circles_insert_own"
  ON support_circle_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ────────────────────────────────────────────────────────────
-- 7. EVENT-DRIVEN OUTBOX: outbox_messages
-- ────────────────────────────────────────────────────────────

CREATE TABLE outbox_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id      UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipient_id   UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  payload        JSONB NOT NULL DEFAULT '{}',
  status         message_status NOT NULL DEFAULT 'queued',
  deliver_after  TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE outbox_messages ENABLE ROW LEVEL SECURITY;

-- Senders can read, insert, and update their own outbox messages.
CREATE POLICY "outbox_select_own"
  ON outbox_messages FOR SELECT
  USING (auth.uid() = sender_id);

CREATE POLICY "outbox_insert_own"
  ON outbox_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "outbox_update_own"
  ON outbox_messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- Recipients can read messages delivered to them.
CREATE POLICY "outbox_select_recipient"
  ON outbox_messages FOR SELECT
  USING (auth.uid() = recipient_id AND status = 'delivered');


-- ────────────────────────────────────────────────────────────
-- 8. INDEXES (performance)
-- ────────────────────────────────────────────────────────────

CREATE INDEX idx_mood_logs_user       ON mood_logs (user_id, created_at DESC);
CREATE INDEX idx_kudos_recipient      ON kudos_posts (recipient_id, created_at DESC);
CREATE INDEX idx_circles_topic        ON support_circle_messages (topic_channel, created_at DESC);
CREATE INDEX idx_outbox_status        ON outbox_messages (status, deliver_after)
                                       WHERE status = 'queued';
CREATE INDEX idx_profiles_deletion    ON user_profiles (status, deletion_scheduled_at)
                                       WHERE status = 'scheduled_for_deletion';


-- ────────────────────────────────────────────────────────────
-- 9. UPDATED_AT TRIGGER (auto-touch on row update)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles_updated
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_outbox_messages_updated
  BEFORE UPDATE ON outbox_messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ────────────────────────────────────────────────────────────
-- 10. PG_CRON SCHEDULED JOBS
-- ────────────────────────────────────────────────────────────

-- 10a. Daily Account Purge — runs every day at midnight UTC.
--      Hard-deletes profiles whose grace period has expired.
SELECT cron.schedule(
  'daily_account_purge',
  '0 0 * * *',
  $$
    DELETE FROM user_profiles
    WHERE status = 'scheduled_for_deletion'
      AND deletion_scheduled_at <= NOW();
  $$
);

-- 10b. Process Outbox Queue — runs every 5 minutes.
--      Delivers held messages whose deliver_after window has passed.
SELECT cron.schedule(
  'process_outbox_queue',
  '*/5 * * * *',
  $$
    UPDATE outbox_messages
    SET    status = 'delivered'
    WHERE  status = 'queued'
      AND  deliver_after <= NOW();
  $$
);
