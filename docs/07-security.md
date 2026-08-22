## 7. Security

Maps PRD Section VII and Section X to current implementation status.

| Requirement | Status | Note |
|---|---|---|
| Encrypt at rest (AES-256) | Supabase default | Confirm project-level setting, not app-level code |
| Encrypt in transit (TLS 1.3) | Supabase default | Same as above |
| Customer-managed encryption keys | Not implemented | `AdminConsole.tsx` has a config field; no actual CMEK wiring |
| Role-based access, RLS on every route | Partial | RLS exists on core tables; k-anonymity threshold not enforced at query level (see Audit item 1) |
| Immutable audit log | Implemented | `AdminConsole.tsx`, `UserManagement.tsx` write to an audit table on config and account changes |
| Independent privacy audits | Not applicable yet | No audit has occurred; PRD Section XII calls for an annual third-party summary once live |
| Short-lived access tokens, rotating refresh | Supabase Auth default | Confirm token lifetime settings match policy, do not assume defaults are correct |
| Camera telemetry: explicit consent, local processing, revocable, org-wide override | Partial | Consent modal and org toggle exist; local vs. server processing not verified in this audit, check `WebcamCVConsentModal.tsx` implementation directly before claiming compliance |

### Non-negotiables for any future feature
- No individual employee data crosses from the private plane to the
  organizational plane without explicit, revocable consent. This is the
  PRD's stated strict architecture boundary. Treat any PR that blurs this
  as blocked, not as a style note.
- No aggregate view renders below the configured cohort threshold, under
  any role, including admin and IT.
- Every admin or IT configuration change writes to the audit log in the
  same transaction as the change, not as a best-effort follow-up call.
