# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` / `npm run build` / `npm run lint` — see AGENTS.md.
- `npx tsc --noEmit` — run `npm run dev` or `npm run build` at least once first (Next.js generates `.next/types`, which `tsconfig.json`'s `include` and `app/layout.tsx`'s `LayoutProps` depend on).
- **There is no test suite.** `npm test` is an unwired stub (`exit 1`); no Jest/Vitest/Playwright is configured and no `*.test.*` files exist anywhere. There is also no CI workflow — lint/typecheck/build are not enforced automatically. If you add tests, you're introducing the first ones; don't assume a runner or config already exists.
- `capture_ui.js` — a one-off Puppeteer script that screenshots `/manager`; requires `npm run dev` running separately. It's a manual visual-check tool, not an automated test.

## Architecture notes beyond AGENTS.md

**Auth is entirely client-side, no middleware.** There is no `middleware.ts` and no server Supabase client (`@supabase/ssr` is not used anywhere). `app/components/AppShell.tsx` (mounted in `app/layout.tsx`) owns the single browser Supabase client session: it calls `supabase.auth.getSession()`/`onAuthStateChange`, renders its own login form when there's no session, and exposes `{ currentUser, triggerRefresh, session }` via an `AuthContext` it defines itself (this context lives in `app/components/`, not `app/context/` — only the accessibility context lives there). Route "protection" is this component gating its children, not a Next.js redirect/guard — every page assumes it's already mounted inside `AppShell`.

**Route files are thin wrappers.** Every `app/*/page.tsx` is `'use client'` and just renders one component from `app/components/` — the actual logic, state, and Supabase calls live in the component, not the page.

**Row-Level Security is the only access-control layer, and it's wide open by default.** Migration `008_grant_table_permissions.sql` grants full CRUD on every table (and future tables, via `ALTER DEFAULT PRIVILEGES`) to `anon`/`authenticated`/`service_role`. RLS policies are the sole thing preventing unauthorized reads/writes. When adding a new table, you must enable RLS and write policies yourself — the default grants mean an RLS-less table is fully open. Migration `007_fix_recursive_policies.sql` exists because an earlier admin-check policy on `user_profiles` recursed infinitely; the fix pattern (a `SECURITY DEFINER` helper like `public.is_admin()`) is the one to follow for similar role checks.

**Two `pg_cron` jobs drive time-based behavior server-side** (defined in `001_pulse_complete_schema.sql`): `process_outbox_queue` (every 5 min, flips `outbox_messages` from `queued`→`delivered` once `deliver_after <= NOW()`) and `daily_account_purge` (midnight UTC, hard-deletes accounts past their deletion grace period). These are the real enforcement point for the right-to-disconnect delay and account deletion — UI components only queue state changes for these jobs to act on.

**The k-anonymity threshold is not actually enforced yet — know this before touching it.** `admin_configs.privacy_floor` is a real, admin-only-writable DB value, but the count it's compared against in `ManagerDashboard.tsx` (`responseCount`) is hardcoded via `useState(3)` and never updated from a real query — the privacy-blur gate is not driven by live team data. `KAnonymityEmptyState.tsx` on the home page is a separate, self-contained demo with its own mock toggle; don't mistake it for the real gating logic. There's also no database-level (RLS/view) enforcement of the floor — it's UI-only today. Given AGENTS.md's instruction to treat this logic as high-risk, be explicit with the user about this gap rather than assuming the existing comparison is meaningful when extending it.

**Generated/boilerplate files to leave alone:** `app/lib/database.types.ts` (Supabase-generated), and `README.md` (unmodified `create-next-app` boilerplate — no project info lives there).

**Other reference material in the repo** (not authoritative instructions, but useful context): `docs/01-project-audit.md` through `docs/13-plan-organization.md`, and `.agents/skills/*/SKILL.md` (adr-writer, changelog-generator, convention-enforcer, deploy-checklist, migration-reviewer, readme-updater, secrets-and-env-guard, security-review).
