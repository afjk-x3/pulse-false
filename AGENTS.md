# AGENTS.md

## Project
Pulse: AxionHR Well-Being Guardian. Employee well-being dashboard with
burnout tracking, sentiment logging, kudos, and support circles. Privacy
controls are core to the product, not an add-on: k-anonymity thresholds,
consent modals, right-to-disconnect outbox.

## Stack
- Next.js 16, App Router, Turbopack
- React 19, TypeScript (strict mode)
- Tailwind CSS 4
- Supabase (auth + Postgres)

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — ESLint, must pass with 0 errors before commit
- `npx tsc --noEmit` — type check. Run `npm run dev` or `npm run build`
  first if this is a fresh checkout; Next.js generates route types
  (`.next/types`) that `layout.tsx` depends on (`LayoutProps`).

## Structure
- `app/*/page.tsx` — routes (admin, manager, coffee, inbox, kudos,
  privacy, settings, support, users)
- `app/components/` — feature components, one file per concern
- `app/lib/` — Supabase client, generated database types
- `app/context/` — React context providers (accessibility)
- `supabase/migrations/` — schema history, numbered and additive.
  Never edit a shipped migration; add a new one.

## Conventions
- Client components are marked `'use client'` explicitly at the top.
- Database types in `app/lib/database.types.ts` are generated, not
  hand-written. Regenerate after a migration instead of editing by hand.
- Privacy-sensitive components (k-anonymity thresholds, consent flows,
  outbox delays) encode compliance logic. Treat changes to these as
  higher-risk; don't loosen a threshold or skip a consent check to make
  a feature simpler.

## Before committing
Run lint and type check. Both must be clean.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
