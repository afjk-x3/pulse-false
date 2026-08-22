## 3. Tasks

Group tasks by phase. Do not start a task from a later phase before its
dependencies from an earlier phase are checked off.

### Phase 7 (current, do these first)
- [ ] Write a Postgres function or view that returns manager-facing BRI
  aggregates only when the cohort row count meets the configured threshold;
  return an empty set otherwise. Wire `ManagerDashboard.tsx` to call it
  instead of rendering the hardcoded chart array.
- [ ] Add an RLS policy or `SECURITY DEFINER` function guard so the same
  threshold rule applies even if a manager queries Supabase directly.
- [ ] Reconcile `pulse-cv-active` / `pulse-cv-consent` localStorage flags in
  `Header.tsx` with `webcam_cv_global_disabled`; the global flag must always
  win, checked on every read, not only on toggle.
- [ ] Write `.env.example` covering `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, service role key, and any admin secrets
  currently read from environment.
- [ ] Add `vitest` or `jest` plus `@testing-library/react`; write the first
  four tests (k-anonymity floor, outbox delay math, deletion grace period,
  camera kill switch precedence).
- [ ] Add `.github/workflows/ci.yml` running lint, type check, and tests on
  every PR.
- [ ] Update `AGENTS.md` to remove the false "all localStorage removed"
  claim, or make it true by moving the remaining local-only prefs to
  Supabase (accessibility settings are a reasonable exception to call out
  explicitly, since they are non-sensitive and benefit from instant local
  read).

### Phase 8
- [ ] Product decision: on-device BRI (Path A) or revised PRD language
  (Path B). Get this signed off before writing code.
- [ ] Implement baseline creation from first 5 days of signals.
- [ ] Implement 30-day recalibration.
- [ ] Implement "not enough data yet" state for under-3-days users.
- [ ] Implement the confidence rule: low-confidence scores never reach the
  organizational plane.

### Phase 9
- [ ] Expand test suite to cover every RLS policy with a positive and a
  negative case (authorized read succeeds, unauthorized read returns zero
  rows, not an error that leaks existence).
- [ ] Run and document a WCAG 2.2 AA pass on the four most-used flows: mood
  check-in, wind-down, manager dashboard, admin console.
- [ ] Compliance checklist mapped to specific files (see Section 9,
  Backend Security Rules, for the checklist skeleton).

### Phase 10
- [ ] Vercel or hosting config committed (or documented if secrets prevent
  committing).
- [ ] Deployment runbook.
- [ ] Monitoring and error-tracking hookup (Sentry or equivalent) for
  production error visibility, scoped so it never logs mood check-in
  content, message text, or support circle content.
