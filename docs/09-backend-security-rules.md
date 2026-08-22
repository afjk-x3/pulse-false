## 9. Backend Security Rules

Apply to every Supabase migration and every API route.

1. Every new table gets `ENABLE ROW LEVEL SECURITY` in the same migration
   that creates it. No table ships without RLS, including internal or
   admin-only tables.
2. Every policy that returns aggregate or cross-employee data must include
   an explicit minimum-count guard, not rely on the calling component to
   check the count client-side.
3. Every write to `admin_configs`, `security_configs`, or any table that
   changes a privacy-relevant setting (threshold, kill switch, camera
   control) must also insert an audit log row, in the same transaction.
4. Service role keys never ship to the client. Grep the codebase for
   `SUPABASE_SERVICE_ROLE` before every release; it should only appear in
   server-only files or edge functions, never in a `'use client'` file.
5. Migrations are additive only, numbered sequentially, never edited after
   merge to main.
6. Compliance checklist skeleton for Phase 9 (fill in the file reference
   column as each item closes):

| Requirement | Regulation | File reference |
|---|---|---|
| Data minimization on mood logs | GDPR | |
| Right to erasure (deletion + purge) | GDPR | `001_pulse_complete_schema.sql` (pg_cron purge) |
| Right to portability (export) | GDPR | `PrivacyCenter.tsx` |
| Consent for biometric/camera data | GDPR, various state law | `WebcamCVConsentModal.tsx` |
| Access control audit trail | SOC 2 | audit log table |
| Encryption at rest and in transit | SOC 2, ISO 27001 | Supabase project settings |
| Right-to-disconnect enforcement | EU member-state law (varies) | `RightToDisconnectOutbox.tsx` |
