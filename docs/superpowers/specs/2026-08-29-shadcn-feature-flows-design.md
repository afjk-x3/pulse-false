# Phase 7a: shadcn/ui Migration — Feature Flows

**Date:** 2026-08-29
**Status:** Approved, pending implementation plan
**Scope:** Architectural (touches build config, design tokens, and 6 routes)

## Context

Pulse is a feature-complete prototype (Phase 0–6 done) currently in Phase 7
(Enterprise UI Rebuild). The existing UI is hand-built Tailwind CSS 4 with a
distinct visual identity — glassmorphism cards, a teal/rose accent pair, and
three category-color triads (sage/cerulean/terracotta) — defined as CSS
variables in `app/globals.css` under a Tailwind 4 `@theme` block. There is no
`tailwind.config.ts`; this project uses Tailwind 4's CSS-first configuration.

The team wants to adopt shadcn/ui going forward for its accessible primitives
(Dialog, Select, RadioGroup, etc.) and composition patterns, without a
full-app rewrite and without abandoning the existing visual identity.

This spec covers the **first slice** of that migration: the six lower-complexity
feature-flow routes. The three core dashboards (`/`, `/manager`, `/admin`) and
the shared layout shell (`AppShell`, `Sidebar`, `Header`) are explicitly
out of scope here — they get their own spec once this slice proves the pattern.

## Decisions

1. **Migration strategy: gradual.** shadcn components are introduced route by
   route. Untouched routes keep their current hand-built Tailwind markup
   until their turn comes. Nothing is deleted or dual-maintained outside the
   route being actively migrated.
2. **Theming: shadcn defaults, retargeted via CSS variables.** We do not hand-edit
   shadcn's generated component source to bolt on custom classes. Instead, we
   map shadcn's standard CSS-variable contract (`--primary`,
   `--primary-foreground`, `--radius`, etc.) onto this app's existing teal
   accent and glass-card look, in `app/globals.css`. shadcn components then
   render on-brand automatically, with zero per-component overrides needed
   for the common case.
3. **Data fetching: page-level RSC.** Each route's `page.tsx` becomes (or
   stays) a Server Component that fetches initial data via the Supabase
   server client and passes it as props into a client component that owns
   interactivity. We do not push RSC fetching further down the tree in this
   slice — one fetch boundary per route keeps the migration mechanical and
   reviewable.
4. **Accessibility: consume, don't duplicate.** shadcn components must read
   `useAccessibility()` (`app/context/AccessibilityContext.tsx`) for font
   scale, high contrast, and dyslexic font, the same way existing components
   do — via the existing `body` class toggles (`text-large`, `high-contrast`,
   `font-dyslexic`), not a parallel theming mechanism. No new accessibility
   opt-in is introduced by shadcn.
5. **Route order: feature flows first.** Privacy, Settings, Coffee Roulette,
   Inbox, Kudos, Support Circles. Core dashboards and shared layout come in a
   later phase (Phase 7b), out of scope here.

## Setup (one-time, before route work starts)

- Run `npx shadcn@latest init`, targeting:
  - Components directory: `app/components/ui/`
  - Utils file: `app/lib/utils.ts` (new — provides `cn()`, does not exist yet)
  - Style: default (New York or Default — decide at init time; either is
    compatible with the glass-card look since we retarget tokens anyway)
- In `app/globals.css`, extend the existing `@theme` block (do not create a
  `tailwind.config.ts` — this project is Tailwind-4 CSS-first) with shadcn's
  expected variable names, pointed at this app's existing values:
  - `--primary` / `--primary-foreground` → the app's teal accent
    (currently used ad hoc as Tailwind's `teal-600` / `teal-500` utility
    classes across components)
  - `--destructive` → existing rose/red usage
  - `--radius` → match the existing `rounded-2xl` / `rounded-xl` card radius
  - `--card`, `--border` → map to the existing `--card-bg` / `--border-color`
    glassmorphism variables so shadcn's `Card` inherits the glass look
    without modification
  - `--background`, `--foreground` → already defined, reuse as-is
- Verify high-contrast mode: confirm the existing `body.high-contrast`
  override block (which already redefines `--background`, `--foreground`,
  `--card-bg`, `--border-color`, and the category triads) also correctly
  cascades into the new shadcn variable names, since those are defined as
  aliases of the same custom properties.

## Route-by-Route Scope

Each route follows the same shape: `page.tsx` fetches via Supabase server
client and passes props to the existing top-level client component, which is
refactored in place to compose shadcn primitives instead of hand-built
markup. Component file names below are existing files being edited, not new
files, unless marked **(new)**.

### 1. `/privacy` — Privacy Center
- `app/privacy/page.tsx` — Server Component: fetch deletion status, export
  readiness state.
- `app/components/PrivacyCenter.tsx` — refactor deletion-review flow onto
  shadcn `Dialog`; action triggers onto shadcn `Button`.
- `app/components/ui/dialog.tsx`, `button.tsx`, `card.tsx`, `progress.tsx`
  **(new, via shadcn CLI)** — export-progress indicator uses `Progress`.

### 2. `/settings` — Settings View
- `app/settings/page.tsx` — Server Component: fetch user profile +
  accessibility prefs.
- `app/components/SettingsView.tsx` — refactor form controls onto shadcn
  `Form` (or plain controlled shadcn inputs, decided during implementation
  planning if `react-hook-form` is not otherwise needed), `Select` for font
  scale, `RadioGroup` for nudge style, `Checkbox` for contrast toggle,
  `Slider` for TTS speed/pitch.
- `app/components/ui/select.tsx`, `radio-group.tsx`, `checkbox.tsx`,
  `slider.tsx`, `form.tsx` **(new, via shadcn CLI)**.

### 3. `/coffee` — Coffee Roulette
- `app/coffee/page.tsx` — Server Component: fetch match history, current
  match status.
- `app/components/CoffeeRoulette.tsx` — refactor match display onto shadcn
  `Card`; accept/decline/request actions onto shadcn `Button`.

### 4. `/inbox` — Direct Messages
- `app/inbox/page.tsx` — Server Component: fetch message threads.
- Message-list component under `app/components/` (current inbox rendering
  logic — confirm exact file during planning; it is not one of the 22 named
  components in the audit and may currently live inline in `page.tsx`)
  refactored onto shadcn list/card patterns for message items, `Input` +
  `Button` for compose.
- **Explicitly not touched:** `Header.tsx`'s notification bell/dropdown —
  that belongs to the shared-layout slice (Phase 7b), not this one.

### 5. `/kudos` — Kudos Feed
- `app/kudos/page.tsx` — Server Component: fetch kudos posts + user's kudos
  count.
- `app/components/KudosFeed.tsx` — refactor post cards onto shadcn `Card`;
  post-creation flow onto shadcn `Dialog` + `Button`.

### 6. `/support` — Support Circles
- `app/support/page.tsx` — Server Component: fetch circles + membership
  status.
- `app/components/SupportCircles.tsx` — refactor circle cards onto shadcn
  `Card`; join/leave actions onto shadcn `Button`; join flow onto shadcn
  `Dialog` if it currently requires confirmation.

## Explicitly Out of Scope (this spec)

- `/` (Home/Dashboard), `/manager`, `/admin` — deferred to Phase 7b (core
  dashboards, higher data-viz complexity).
- `AppShell.tsx`, `Sidebar.tsx`, `Header.tsx` — shared layout shell, deferred
  to Phase 7b.
- Any change to RLS policies, migrations, or `database.types.ts`. This is a
  presentation-layer migration; no schema or query-shape changes.
- Any change to k-anonymity enforcement or BRI computation (tracked
  separately in Phase 8/9 per `docs/03-tasks.md`).
- Progressive-disclosure layout redesign and the WCAG audit-and-inject pass
  listed elsewhere in the Phase 7 task list — those are separate tasks that
  may incidentally benefit from shadcn's built-in ARIA behavior but are not
  the goal of this slice.

## Testing

- Existing Playwright smoke test (`e2e/auth-gate.spec.ts`) must keep passing
  unmodified — it only asserts the logged-out sign-in gate, which this spec
  does not touch.
- For each migrated route, add or extend a component-level Vitest test
  (pattern established in `app/components/KAnonymityEmptyState.test.tsx`)
  covering its core interactive behavior post-migration (e.g., Settings:
  changing font scale still updates `AccessibilityContext`; Coffee Roulette:
  accept/decline still calls the expected Supabase mutation).
- Manual pass per route: verify high-contrast mode, dyslexic font, and each
  font-scale step still render correctly against the new shadcn components,
  via `npm run dev`.

## Open Questions For Implementation Planning

- Exact component file(s) backing `/inbox`'s message list (not enumerated in
  the original audit's 22-component list) — resolve by reading
  `app/inbox/page.tsx` before planning that route.
- Whether `react-hook-form` is worth adding for `/settings`'s form, or plain
  controlled shadcn inputs are simpler given the small number of fields.
- shadcn style variant (New York vs. Default) — either works with token
  retargeting; pick one at `init` time and keep it consistent for all
  subsequent `add` commands.
