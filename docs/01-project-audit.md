# 1. Project Audit (current state, read this first)

### Method
Audit performed by cloning the repo and checking file presence, grep for
feature keywords, and reading the security-critical files directly (RLS
policies, admin console, manager dashboard, BRI computation, deletion flow).
No code was run; this is a static audit.

### What exists
- Stack matches `AGENTS.md`: Next.js 16, React 19, TypeScript, Tailwind 4,
  Supabase (`@supabase/supabase-js`).
- 8 migrations (`001` through `008`), additive, RLS enabled on core tables.
- 9 routes: `/`, `/admin`, `/coffee`, `/inbox`, `/kudos`, `/manager`,
  `/privacy`, `/settings`, `/support`, `/users`.
- 22 feature components covering nearly every PRD feature ID: mood check-in
  (`SentimentWidget`), BRI (`BurnoutRiskIndex`, `BRIExplainerCard`,
  `BRIExplanationFeed`), wind-down (`WindDownRoutine`), micro-coaching
  (`MicroCoachingNudge`), outbox (`RightToDisconnectOutbox`), calendar guard
  (`CalendarGuard`, `MeetingTimeline`), kudos (`KudosFeed`), support circles
  (`SupportCircles`), coffee roulette (`CoffeeRoulette`), notifications
  (`Header` inbox), manager dashboard (`ManagerDashboard`), account
  provisioning and lifecycle (`UserManagement`), admin console (`AdminConsole`
  — kill switch, camera global toggle, audit log, SSO/SCIM config fields,
  holiday calendar, working hours), privacy center (`PrivacyCenter` — export,
  delete, deletion review), accessibility (`AccessibilityContext` — dyslexic
  font, reading ruler, high contrast, TTS, font scale).
- Automated account purge is real: migration `001` schedules a `pg_cron` job
  (`daily_account_purge`) that hard-deletes profiles past
  `deletion_scheduled_at`. This matches PRD Section IX.
- Consent modal for camera telemetry exists (`WebcamCVConsentModal`) and a
  global org-wide override exists in `AdminConsole` (`webcam_cv_global_disabled`).

### Gaps that block production (fix before Phase 7 closes)
1. **K-anonymity threshold is not enforced server-side.** `ManagerDashboard.tsx`
   gates the chart with a client-side comparison (`responseCount < kanonFloor`)
   against a hardcoded, simulated chart array, not a live aggregate query. The
   PRD requires enforcement "at both the display and API level, so it cannot
   be bypassed" (Section 5.15, Section VII). Right now, nothing stops a
   direct API or Supabase client call from reading below-threshold aggregate
   data, because no aggregate query with a `HAVING count >= threshold` clause
   exists in the migrations.
2. **BRI does not run on-device.** PRD Section VI states the Burnout Risk
   Index computes locally on the employee's device and raw signals never
   reach the server. The current implementation stores computed results in a
   `bri_shift_records` table and reads them back with a normal `SELECT`.
   Baseline creation, 30-day recalibration, drift detection, and the
   "not enough data yet" confidence rule from Section VI, Steps 1-5 have no
   matching code in the repo.
3. **SSO/SCIM are UI state, not integrations.** `AdminConsole.tsx` stores
   `sso_provider` and `scim_enabled` as plain config values. No SAML or SCIM
   provider integration exists. Fine for a mock admin screen, not fine to
   present as "Enterprise Security Controls" (Section 5.18) without a label
   telling the team this is a placeholder.
4. **Zero automated tests.** `package.json` test script is the default stub
   (`echo "Error: no test specified" && exit 1`). No `*.test.*` or `*.spec.*`
   files anywhere in the repo.
5. **No CI/CD.** No `.github/workflows`, no `vercel.json`, no `.env.example`.
   A new contributor has no documented path from clone to a working local
   Supabase instance.
6. **localStorage still in use** in four files (`SentimentWidget`,
   `CoffeeRoulette`, `Header`, `AccessibilityContext`) for timestamps, pause
   state, webcam consent flags, and accessibility prefs. AGENTS.md claims
   "all prototype localStorage dependencies have been completely removed."
   That claim is false as written. Some of this usage (accessibility
   preferences, UI-only pause toggles) is defensible as local-only state and
   does not need to move to Supabase. The webcam consent flags in `Header.tsx`
   are privacy-relevant and should be reconciled with the `webcam_cv_global_disabled`
   config so a stale local flag can never override an org-wide kill.

### Phase you are in
Ten phases total (defined in Section 8, Implementation Plan). Feature
components exist for Phases 0 through 6. That covers foundation, the
two-plane data layer, employee core features, boundary protection, peer and
social features, org/HR features, and admin/IT controls.

**You are in Phase 7: Hardening and Compliance, and it is not close to done.**
The UI surface is far ahead of the security and QA surface. Treat this as a
feature-complete prototype, not a production-ready platform. Three items sit
between here and Phase 8: server-side k-anonymity enforcement, a real or
honestly-labeled BRI computation model, and a first test suite. Do not add
new employee-facing features until those three close; new features widen the
gap between what the UI promises and what the backend actually guarantees.
