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
3. **Data fetching: unchanged (client-side), by necessity.** RSC fetching was
   considered but is blocked: this app has no cookie-based Supabase session
   (only `@supabase/supabase-js` with `localStorage` persistence is
   installed — no `@supabase/ssr`, no `middleware.ts`), so a Server
   Component has no way to read the current user's session. Making RSC work
   would require migrating the whole app to cookie-based auth, an app-wide,
   security-relevant change out of proportion to a styling migration. Every
   `page.tsx` in this slice stays (or becomes, where currently inlined) a
   thin `'use client'` route file that renders the existing top-level
   feature component, which continues to fetch via `useEffect` and the
   browser Supabase client exactly as it does today. Cookie-based auth +
   RSC fetching is deferred to its own future phase, to be scoped and
   approved separately.
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

Each route keeps its current `'use client'` data-fetching exactly as-is (see
Decision 3) — only presentation markup changes, swapping hand-built Tailwind
for shadcn primitives. Component file names below are existing files being
edited, not new files, unless marked **(new)**.

**Implementation sequencing:** this spec is implemented as a separate plan
per route (plus one setup pass), not one combined plan — each plan produces
independently testable, shippable software, and the pattern proven on the
first route informs the rest. The first plan covers Setup + `/privacy`
(smallest route, and its Dialog/Button/Card/Progress usage exercises most of
the primitives the other five routes also need). Subsequent routes are
planned one at a time as prior ones land.

### 1. `/privacy` — Privacy Center
- `app/privacy/page.tsx` (currently 5 lines: `'use client'` wrapper
  rendering `<PrivacyCenter />`) — unchanged structurally, stays as the thin
  client wrapper.
- `app/components/PrivacyCenter.tsx` (320 lines) — refactor deletion-review
  flow onto shadcn `Dialog`; action triggers onto shadcn `Button`.
- `app/components/ui/dialog.tsx`, `button.tsx`, `card.tsx`, `progress.tsx`
  **(new, via shadcn CLI)** — export-progress indicator uses `Progress`.

### 2. `/settings` — Settings View
- `app/settings/page.tsx` (currently 9 lines: `'use client'` wrapper reading
  `AuthContext` and rendering `<SettingsView currentUser={...} onUserUpdated={...} />`)
  — unchanged structurally.
- `app/components/SettingsView.tsx` (396 lines) — refactor form controls
  onto shadcn `Form` (or plain controlled shadcn inputs, decided during
  implementation planning if `react-hook-form` is not otherwise needed),
  `Select` for font scale, `RadioGroup` for nudge style, `Checkbox` for
  contrast toggle, `Slider` for TTS speed/pitch.
- `app/components/ui/select.tsx`, `radio-group.tsx`, `checkbox.tsx`,
  `slider.tsx`, `form.tsx` **(new, via shadcn CLI)**.

### 3. `/coffee` — Coffee Roulette
- `app/coffee/page.tsx` (currently 5 lines, same thin-wrapper shape as
  `/privacy`) — unchanged structurally.
- `app/components/CoffeeRoulette.tsx` (376 lines) — refactor match display
  onto shadcn `Card`; accept/decline/request actions onto shadcn `Button`.

### 4. `/inbox` — Direct Messages
- `app/inbox/page.tsx` (361 lines) — **resolved:** unlike the other five
  routes, `/inbox` has no separate feature component; all state, Supabase
  queries (contacts, messages, realtime subscription), and markup live
  directly in `page.tsx`. The migration touches this one file: contact list
  and message bubbles onto shadcn `Card`/list patterns, compose bar onto
  shadcn `Input` + `Button`.
- **Explicitly not touched:** `Header.tsx`'s notification bell/dropdown —
  that belongs to the shared-layout slice (Phase 7b), not this one.

### 5. `/kudos` — Kudos Feed
- `app/kudos/page.tsx` (currently 5 lines, same thin-wrapper shape as
  `/privacy`) — unchanged structurally.
- `app/components/KudosFeed.tsx` (540 lines) — refactor post cards onto
  shadcn `Card`; post-creation flow onto shadcn `Dialog` + `Button`.

### 6. `/support` — Support Circles
- `app/support/page.tsx` (currently 5 lines, same thin-wrapper shape as
  `/privacy`) — unchanged structurally.
- `app/components/SupportCircles.tsx` (612 lines) — refactor circle cards
  onto shadcn `Card`; join/leave actions onto shadcn `Button`; join flow onto
  shadcn `Dialog` if it currently requires confirmation.

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

- Whether `react-hook-form` is worth adding for `/settings`'s form, or plain
  controlled shadcn inputs are simpler given the small number of fields.
- shadcn style variant (New York vs. Default) — either works with token
  retargeting; pick one at `init` time and keep it consistent for all
  subsequent `add` commands.
