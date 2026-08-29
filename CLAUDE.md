# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Docs that extend AGENTS.md

`docs/` splits out detail AGENTS.md doesn't cover. Read the relevant one before touching that area:

- `docs/04-dev-guide.md` — local setup, branch/commit workflow, rules for touching privacy-sensitive code
- `docs/07-security.md` / `docs/09-backend-security-rules.md` — RLS, audit-log, and k-anonymity rules that apply to every migration
- `docs/10-frontend-ui-rules.md` — client-component and accessibility rules
- `docs/11-design-system.md` — color tokens, font scale, category-color triads in `app/globals.css`
- `docs/01-project-audit.md` — record of product decisions on thresholds/consent; check here before loosening any privacy control

## Architecture

- **No server API routes.** There is no `app/api/`. Every client component talks to Postgres directly through `app/lib/supabaseClient.ts`; enforcement lives in Row Level Security policies defined in `supabase/migrations/`, not in application code. When adding a feature that needs access control, the fix is a policy change, not a client-side check.
- **Two-plane privacy model.** Individual employee data (private plane) must never reach organizational aggregate views (org plane) without explicit, revocable consent. Aggregate queries must enforce a minimum-cohort (k-anonymity) threshold inside the RLS policy/query itself, never only in the rendering component.
- `app/lib/database.types.ts` is generated from the live schema — regenerate it after every migration, never hand-edit.
- `app/context/AccessibilityContext.tsx` holds font scale, dyslexic font, high contrast, and reading-ruler state used across the app; new interactive components should consume it rather than adding a separate accessibility opt-in.

## Testing

No test suite exists (`npm test` is a placeholder). Verify changes with `npm run lint`, `npx tsc --noEmit`, and manual checking via `npm run dev`.
