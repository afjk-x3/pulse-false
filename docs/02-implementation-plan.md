## 2. Implementation Plan (forward roadmap)

| Phase | Name | Status |
|---|---|---|
| 0 | Foundation (scaffold, Supabase project, auth) | Done |
| 1 | Two-plane data layer (migrations, RLS, types) | Done |
| 2 | Employee core (mood check-in, BRI display, wind-down, micro-coaching) | Done, BRI architecture wrong (see Audit item 2) |
| 3 | Boundary protection (outbox, calendar guard) | Done |
| 4 | Peer and social (kudos, support circles, coffee roulette, notifications) | Done |
| 5 | Org/HR (manager dashboard, provisioning, deletion review) | Done, threshold enforcement wrong (see Audit item 1) |
| 6 | Admin/IT (global prefs, kill switch, camera control, audit log) | Done, SSO/SCIM are placeholders (see Audit item 3) |
| 7 | Hardening and compliance | In progress, blocking |
| 8 | Predictive analytics correctness (real drift model) | Not started |
| 9 | QA and compliance sign-off (tests, SOC 2 / ISO 27001 / GDPR checklist) | Not started |
| 10 | Launch readiness (CI/CD, monitoring, deploy docs) | Not started |

### Phase 7 exit criteria
- Manager dashboard reads a real aggregate query with a database-level
  minimum-count guard. No cohort under threshold returns rows to the client,
  under any role.
- `.env.example` committed with every required Supabase and app variable
  named, no values filled in.
- A GitHub Actions workflow runs `npm run lint`, `npx tsc --noEmit`, and the
  test suite on every pull request.
- At minimum one integration test per privacy boundary: k-anonymity floor,
  outbox delay, deletion grace period, camera kill switch.

### Phase 8 exit criteria
- Decide and document one of two paths, since the current architecture
  cannot satisfy the PRD's "raw signals never reach the server" claim without
  a rewrite:
  - Path A (matches PRD as written): move BRI computation into a client-side
    worker or edge function that runs on the employee's device, sends only
    the computed band (Low/Moderate/Elevated) to Supabase, and never
    transmits raw meeting-load, off-hours, or interruption counts.
  - Path B (revise the PRD): keep server-side computation, and update
    Section VI and the product vision language to describe encrypted
    server-side computation rather than on-device computation. This is a
    product decision, not an engineering one. Flag it to the product owner
    before writing more BRI code.
- Baseline creation (first 5 days), 30-day recalibration, and the
  "not enough data yet" state for under-3-days users, all implemented and
  tested.

### Phase 9 exit criteria
- Test coverage on every privacy-enforcing path (threshold, consent,
  deletion, outbox override).
- A completed SOC 2 / ISO 27001 / GDPR / Right-to-Disconnect checklist
  mapped to the specific migration, RLS policy, or component that satisfies
  each requirement. No requirement marked "done" without a file reference.

### Phase 10 exit criteria
- CI green on main.
- Deployment runbook in `/docs`.
- Rollback plan for a failed migration.
