-- ============================================================
-- Pulse: AxionHR Well-Being Guardian (WBG)
-- Extended Database Schema — Migration 002
-- Supabase (PostgreSQL) | August 2026
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. ALTER TABLE: user_profiles (extended fields)
-- ────────────────────────────────────────────────────────────

ALTER TABLE user_profiles
  ADD COLUMN timezone                   TEXT NOT NULL DEFAULT 'Asia/Manila',
  ADD COLUMN working_hours_start        TIME NOT NULL DEFAULT '09:00',
  ADD COLUMN working_hours_end          TIME NOT NULL DEFAULT '18:00',
  ADD COLUMN avatar                     TEXT,
  ADD COLUMN job_title                  TEXT,
  ADD COLUMN phone                      TEXT,
  ADD COLUMN address                    TEXT,
  ADD COLUMN profile_image              TEXT,
  ADD COLUMN camera_telemetry_consented BOOLEAN NOT NULL DEFAULT FALSE;


-- ────────────────────────────────────────────────────────────
-- 2. CALENDAR GUARD: scheduled_meetings
-- ────────────────────────────────────────────────────────────

CREATE TABLE scheduled_meetings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id  UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ NOT NULL,
  attendees     JSONB NOT NULL DEFAULT '[]',
  is_compliant  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE scheduled_meetings ENABLE ROW LEVEL SECURITY;

-- Organizers can read and create their own meetings.
CREATE POLICY "meetings_select_own"
  ON scheduled_meetings FOR SELECT
  USING (auth.uid() = organizer_id);

CREATE POLICY "meetings_insert_own"
  ON scheduled_meetings FOR INSERT
  WITH CHECK (auth.uid() = organizer_id);

-- Managers can read all meetings for team oversight.
CREATE POLICY "meetings_select_managers"
  ON scheduled_meetings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

CREATE INDEX idx_meetings_organizer ON scheduled_meetings (organizer_id, start_time DESC);


-- ────────────────────────────────────────────────────────────
-- 3. CALENDAR GUARD: calendar_overrides
-- ────────────────────────────────────────────────────────────

CREATE TABLE calendar_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  meeting_id      UUID NOT NULL REFERENCES scheduled_meetings(id) ON DELETE CASCADE,
  override_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE calendar_overrides ENABLE ROW LEVEL SECURITY;

-- Organizers can read and create their own overrides.
CREATE POLICY "overrides_select_own"
  ON calendar_overrides FOR SELECT
  USING (auth.uid() = organizer_id);

CREATE POLICY "overrides_insert_own"
  ON calendar_overrides FOR INSERT
  WITH CHECK (auth.uid() = organizer_id);

-- Managers and admins can read all overrides for audit reporting.
CREATE POLICY "overrides_select_managers"
  ON calendar_overrides FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

CREATE INDEX idx_overrides_organizer ON calendar_overrides (organizer_id, created_at DESC);
CREATE INDEX idx_overrides_meeting   ON calendar_overrides (meeting_id);


-- ────────────────────────────────────────────────────────────
-- 4. BURNOUT RISK INDEX: bri_shift_records
-- ────────────────────────────────────────────────────────────

CREATE TABLE bri_shift_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  previous_band   TEXT NOT NULL,
  new_band        TEXT NOT NULL,
  feature_weights JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bri_shift_records ENABLE ROW LEVEL SECURITY;

-- Employees can only read their own BRI shift history.
CREATE POLICY "bri_select_own"
  ON bri_shift_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "bri_insert_own"
  ON bri_shift_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_bri_user ON bri_shift_records (user_id, created_at DESC);


-- ────────────────────────────────────────────────────────────
-- 5. SYSTEM CONFIG: admin_configs
-- ────────────────────────────────────────────────────────────

CREATE TABLE admin_configs (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_workday_start   TIME NOT NULL DEFAULT '09:00',
  standard_workday_end     TIME NOT NULL DEFAULT '18:00',
  default_holiday_calendar TEXT NOT NULL DEFAULT 'US Federal Calendar',
  privacy_floor            INTEGER NOT NULL DEFAULT 5,
  eap_referral_url         TEXT,
  emergency_kill_switch    BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_configs ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read the global config (needed for working-hour calculations).
CREATE POLICY "admin_configs_select_all"
  ON admin_configs FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can modify the global config.
CREATE POLICY "admin_configs_update_admins"
  ON admin_configs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Auto-touch updated_at on change.
CREATE TRIGGER trg_admin_configs_updated
  BEFORE UPDATE ON admin_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ────────────────────────────────────────────────────────────
-- 6. SECURITY CONFIG: security_configs
-- ────────────────────────────────────────────────────────────

CREATE TABLE security_configs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sso_provider          TEXT,
  scim_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
  data_residency_region TEXT NOT NULL DEFAULT 'Asia-Pacific',
  kms_key_url           TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE security_configs ENABLE ROW LEVEL SECURITY;

-- Only admins can read and modify security configs.
CREATE POLICY "security_configs_select_admins"
  ON security_configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "security_configs_update_admins"
  ON security_configs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Auto-touch updated_at on change.
CREATE TRIGGER trg_security_configs_updated
  BEFORE UPDATE ON security_configs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ────────────────────────────────────────────────────────────
-- 7. AUDIT LOG: audit_logs (append-only)
-- ────────────────────────────────────────────────────────────

CREATE TABLE audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  action     TEXT NOT NULL,
  target     TEXT,
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read the audit log.
CREATE POLICY "audit_select_admins"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Any authenticated user can insert an audit entry (system writes on their behalf).
CREATE POLICY "audit_insert_authenticated"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Append-only: no updates or deletes permitted via RLS.
-- (No UPDATE or DELETE policies are created, making the table immutable through the API.)

CREATE INDEX idx_audit_actor ON audit_logs (actor_id, created_at DESC);
CREATE INDEX idx_audit_time  ON audit_logs (created_at DESC);


-- ────────────────────────────────────────────────────────────
-- 8. COFFEE ROULETTE: coffee_roulette_pairings
-- ────────────────────────────────────────────────────────────

CREATE TABLE coffee_roulette_pairings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_1_id  UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  user_2_id  UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  paired_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status     TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE coffee_roulette_pairings ENABLE ROW LEVEL SECURITY;

-- Users can read pairings they are part of.
CREATE POLICY "roulette_select_own"
  ON coffee_roulette_pairings FOR SELECT
  USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);

-- Users can update pairings they are part of (e.g., pause).
CREATE POLICY "roulette_update_own"
  ON coffee_roulette_pairings FOR UPDATE
  USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);

CREATE INDEX idx_roulette_user1 ON coffee_roulette_pairings (user_1_id, paired_at DESC);
CREATE INDEX idx_roulette_user2 ON coffee_roulette_pairings (user_2_id, paired_at DESC);
