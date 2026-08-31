# Phase 7b: shadcn/ui Migration — Shared Shell & Dashboards

## Context

Phase 7a migrated the six feature-flow routes (`/privacy`, `/settings`,
`/coffee`, `/inbox`, `/kudos`, `/support`) onto shadcn/ui. It is complete,
merged to `master`, and pushed. This spec covers the next slice.

The 7a spec deferred `/` (Home/Dashboard), `/manager`, `/admin`,
`AppShell.tsx`, `Sidebar.tsx`, and `Header.tsx` to "Phase 7b". Reading the
real code before writing this spec showed that framing understates the
work. Those six files are 2,844 lines, but `app/page.tsx` is a composition
shell: it is 189 lines of layout hosting nine unmigrated widgets worth
another 2,823 lines. Counting everything still unmigrated gives ~6,700
lines across 19 components — about 2.3x what the deferred list implies, and
2.8x the size of 7a. So 7b is scoped down here and the remainder is
deferred again to a 7c. See "Scope" below.

Every claim in this document was checked against the current code on
`master`. The 7a spec was factually wrong about four of its six route
sections; do not treat prior spec text as authoritative.

## Scope

### In scope — 8 files, ~3,300 lines

| File | Lines | Role |
| --- | --- | --- |
| `app/components/AppShell.tsx` | 313 | auth, route guard, layout, sign-in, setup modal |
| `app/components/Header.tsx` | 745 | three panels, webcam CV surface |
| `app/components/Sidebar.tsx` | 187 | role-filtered nav, mobile drawer, collapse |
| `app/components/WebcamCVConsentModal.tsx` | 114 | Header-owned consent dialog |
| `app/page.tsx` | 189 | dashboard banner + grid **only** |
| `app/components/ManagerDashboard.tsx` | 681 | team aggregates, provisioning |
| `app/components/AdminConsole.tsx` | 729 | system config, audit log |
| `app/components/UserManagement.tsx` | 399 | account lifecycle table |

`WebcamCVConsentModal` is included because `Header` owns it. Migrating
Header while leaving its only dialog hand-built would strand the last
manual modal in the shell for no reason.

`/users` (`UserManagement.tsx`) appeared in **neither** the 7a scope nor
its deferred list — it fell through the crack between the two specs. It is
adopted here: it is an admin-role route, it sits beside `/admin` in
`Sidebar`'s role config, and both do account-lifecycle work.

### Deferred to Phase 7c — 11 components, ~3,300 lines

Every widget `app/page.tsx` composes: `CalendarGuard` (1,016),
`RightToDisconnectOutbox` (389), `SentimentTrendLine` (297),
`BurnoutRiskIndex` (256), `BRIExplanationFeed` (252), `WindDownRoutine`
(234), `BRIExplainerCard` (156), `KAnonymityEmptyState` (128),
`MeetingTimeline` (95) — plus `SentimentWidget` (306) and
`MicroCoachingNudge` (199), which `AppShell` renders as floating overlays.

These are independent leaves with no ordering constraint on each other and
can be migrated in any order later. 7b restyles the wrapper divs around
them but **does not open these files**.

### Explicitly out of scope

- Any RLS policy change, migration, or `database.types.ts` regeneration.
- Any change to query shape or data flow. This is presentation-layer only.
- The `localStorage` removal task and the WCAG audit-and-inject task listed
  separately in Phase 7. 7b incidentally improves accessibility by adopting
  Radix primitives, but neither task is its goal or its exit criterion.
- Fixing any of the three known backend defects below.

## Known defects that 7b must preserve, not fix

These were found during 7a and while scoping 7b. All three are real, all
three are verified against the code, and all three are **deliberately left
alone** because Phase 7 is a frontend slice. They belong to Phase 8. The
migration must not obscure them.

### 1. `user_profiles` has no colleague-directory read path

`001_pulse_complete_schema.sql` and `007_fix_recursive_policies.sql` leave
exactly two SELECT policies on `user_profiles`, which RLS ORs together:

```sql
CREATE POLICY "users_select_own" ON user_profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "admins_select_all" ON user_profiles FOR SELECT
  USING ( public.is_admin() );
```

A non-admin authenticated user can therefore read **only their own row**.
Confirmed by re-running the same queries with the service-role key, which
returns the rows normally.

Consequences, all pre-existing:

- `/inbox` renders an empty contact list.
- `/kudos` renders an empty recipient combobox.
- **`/manager` renders an empty roster** — `ManagerDashboard` reads
  `user_profiles.select('*').eq('status','active')` and the
  `share_bri_with_manager` opt-in list, and a manager does not satisfy
  `is_admin()`.

`/admin` and `/users` are unaffected; admins satisfy `is_admin()`.
`/support` is unaffected; its name lookup is `.eq('id', user.id)`.

After 7b, `/manager` will still show an empty roster. **That is not a
migration regression.** Fixing it requires a product decision, not just a
policy: `user_profiles` also holds `role`, `email`, `status`,
`deletion_reason`, and `deletion_scheduled_at`, so a blanket
"authenticated can select" policy would leak all of it. The correct shape
is a restricted view or a column-limited policy exposing only `id` and
`full_name` to peers.

### 2. `/manager`'s k-anonymity gate is demo scaffolding

In `ManagerDashboard.tsx`, `responseCount` is initialised to `3` and is
never fetched from the database. It is written only by two on-screen
buttons under a label that reads "Simulate Submissions". The chart it
gates is a hardcoded seven-element array, and the gate itself is a CSS
`blur-md` overlay on markup that is already in the DOM and already on the
client.

It is honestly labelled, so it is demo scaffolding rather than a disguised
hole. But it is exactly what the first Phase 8 task targets ("wire
`ManagerDashboard.tsx` to a real aggregate query instead of the hardcoded
chart array"), and it contradicts the rule in `CLAUDE.md` that aggregate
queries must enforce the threshold "inside the RLS policy/query itself,
never only in the rendering component".

**Preservation rule.** The Simulate Submissions toggle, the
`responseCount < kanonFloor` condition, the blur overlay, its `role="alert"`,
and the hardcoded chart array all survive 7b with unchanged behavior. The
toggle buttons may become `Button` and the panel may become a `Card`, but
the control keeps its label and both of its states. A code comment
referencing the Phase 8 task is added above `responseCount`.

Rationale: deleting the control would remove the only visible evidence that
`/manager` has no real aggregate query behind it, turning a documented gap
into a silent one.

### 3. Header's webcam localStorage flags are never reconciled

`Header.tsx` reads and writes `pulse-cv-active` and `pulse-cv-consent` in
`localStorage` and never reconciles them against the server-side
`webcam_cv_global_disabled` flag, which should always win. 7b copies these
calls across verbatim. The reconciliation is a Phase 8 task; removing
`localStorage` entirely is a separate Phase 7 task.

## Decisions

1. **Scope split.** 7b is shell + dashboards; the nine dashboard widgets
   and two floating overlays go to 7c. Rationale: the shell and dashboards
   carry the architectural coupling and the privacy-display logic; the
   widgets are independent leaves.
2. **`AppShell` is split into three files.** It currently does five jobs in
   313 lines. 7b already rewrites this markup, so the restructure is close
   to free, and it puts the e2e-critical login form in one small file.
3. **The Playwright suite is a contract.** `e2e/auth-gate.spec.ts` must pass
   **unmodified**. Four strings are frozen: the heading `Welcome back`, the
   labels `Work Email` and `Password`, and the button `Sign In to Portal`.
   The `required` attribute stays on both inputs. It is the only regression
   net covering the shell.
4. **The accessibility hub becomes a `Popover`, not a `DropdownMenu`.** It
   contains two range sliders and a `<select>`. `DropdownMenuItem` captures
   arrow keys and closes on select, which would break every control inside
   it. Only the profile menu is a true action menu.
5. **Header's two responsive-dual panels get a breakpoint-conditional
   render.** Radix `Popover` positions itself with inline transform styles,
   so CSS classes that try to re-center it on mobile fight the positioning
   engine. Each panel's contents are extracted into a shared child rendered
   inside `Popover` at `sm` and up and inside `Sheet` below `sm`. This
   preserves today's behavior exactly.
6. **`Sidebar`'s nav is extracted into `SidebarNav` and the mobile drawer
   becomes a `Sheet`.** One `<aside>` currently serves both viewports, and
   `Sheet` unmounts when closed, so it cannot also be the desktop sidebar.
   The extraction lets the same nav render in both. Justified because the
   current mobile drawer has no focus trap and no Escape-to-close — tabbing
   out of an open drawer walks into the page behind it, a real WCAG 2.2 AA
   defect in a phase whose exit criteria name WCAG 2.2 AA.
7. **RSC refactor stays out.** The Phase 7 task list has a separate item for
   moving `app/page.tsx` to React Server Components. 7a deferred RSC and 7b
   does too — mixing a presentation migration with a client/server boundary
   change would make any regression impossible to attribute.

## Components

Already installed and reused: `Button`, `Card`, `Input`, `Switch`,
`Select`, `Slider`, `Dialog`, `Popover`, `Textarea`, `Command`.

New, added in step 1 via `npx shadcn@latest add`:

| Component | Used by | Replaces |
| --- | --- | --- |
| `DropdownMenu` | Header profile menu | hand-built menu + `fixed inset-0` click-catcher |
| `Sheet` | Sidebar drawer, Header mobile panels | transform drawer; centered fixed overlays |
| `Table` | UserManagement, ManagerDashboard | raw `<table>` markup |
| `Tooltip` | Sidebar collapsed labels | native `title=` |
| `Label` | every migrated form | plain `<label>` |
| `Alert` | login error, system-paused banner | ad-hoc styled divs |
| `Badge` | UserManagement role and status pills | ad-hoc styled spans |

The installed set was verified against `app/components/ui/` while writing
this spec; all seven above are genuinely absent.

If the CLI prompts to overwrite an existing file, answer **no** — several
already-installed components were customised during 7a.

## Steps

Each step ends with a full gate — `npm run lint`, `npx tsc --noEmit`,
`npm test`, `npm run build` — plus a manual pass, before the next begins.

### Step 1 — Add primitives, split `AppShell`

Add the seven new components. Then split `AppShell.tsx` into three files:

- **`LoginGate.tsx`** — the split-screen sign-in. Props: the controlled
  email and password values and setters, `error`, and `onSubmit`. No auth
  logic of its own. Uses `Label` + `Input` + `Button`, and `Alert` for the
  error box. Decision 3's four frozen strings and the `required` attributes
  are non-negotiable here.
- **`ProfileSetupDialog.tsx`** — the first-login profile modal, currently a
  hand-rolled `fixed inset-0` overlay. Becomes a `Dialog` with `Label` +
  `Input` + `Button`, gaining Escape-to-close and a focus trap. Its bare
  `alert()` on save failure becomes inline error state, matching how every
  other form in the app reports errors. `open` is driven by
  `setupIncomplete`, computed exactly as today:
  `Boolean(currentUser && !currentUser.phone)`.
- **`AppShell.tsx`** — retains auth state, the role-based redirect guard,
  `AuthContext`, the `pathname` to `activeTab`/`pageTitle` derivation, and
  layout composition. The system-paused banner becomes an `Alert`. The
  `authLoading` bouncing-dots state is left alone: eight lines of pure
  decoration with no primitive to gain from.

`AuthContext` keeps its current export site and shape. Every route consumes
it; moving it would balloon the diff for no benefit.

**Run Playwright before and after this step**, not only at the end.

### Step 2 — `Header`

The largest and highest-risk file. Radix portals to `body` with its own
stacking context, so the hand-tuned `z-[70]` / `z-[100]` / `z-[101]` ladder
is removed rather than ported.

- **Profile menu** to `DropdownMenu` — a genuine list of actions.
- **Accessibility hub** to `Popover` (Decision 4), contents becoming
  `Slider`, `Select`, and `Switch`. All of its state already lives in
  `AccessibilityContext`; none of it moves.
- **Notifications** to `Popover`, with the Decision 5 responsive treatment.
- **`WebcamCVConsentModal`** to `Dialog`.
- The webcam CV panel keeps its `createPortal` and its
  `normal`/`fullscreen`/`bubble` modes untouched — a positioned video
  surface has no shadcn analogue.
- The `pulse-cv-*` `localStorage` calls are copied verbatim (Defect 3).

### Step 3 — `Sidebar`

Extract `SidebarNav` per Decision 6; render it in a `Sheet` below `lg` and
in the existing static `<aside>` at `lg` and up. The role-filtered
`menuItems` array, the `Link`-based navigation, and the collapse toggle are
unchanged. Nav rows become `Button` with `asChild` wrapping the `Link`,
matching the `/inbox` contact-row precedent from 7a. `title={isCollapsed ?
item.label : undefined}` becomes a real `Tooltip`.

### Step 4 — Dashboards

- **`app/page.tsx`** — welcome banner to `Card`; EAP link and Wind-Down
  trigger to `Button`, the former via `asChild` preserving `target="_blank"`
  and `rel="noopener noreferrer"`; the three copy-pasted micro-stat divs
  collapse into one repeated `Card` row. **The `focus-dimming-card
  glass-card` wrapper divs around each child widget are the hard boundary
  between 7b and 7c and are not opened.**
- **`UserManagement`** — `<table>` to `Table`; role and status pills to
  `Badge`; search to `Input`; role `<select>` to `Select`; actions to
  `Button`.
- **`AdminConsole`** — the two hand-built `role="switch"` toggles (org-wide
  webcam CV, SCIM sync) to `Switch`, which supplies switch semantics
  natively instead of by hand-written `role` and `aria-checked`. The
  emergency kill switch is **not** one of them: it is a full-width action
  button whose label flips between "PAUSE PULSE SYSTEM" and "RESUME PULSE
  PORTAL", so it becomes a `Button` with a destructive variant and keeps
  both label strings. Four
  `<select>` to `Select`; config fields to `Input` + `Label`; panels to
  `Card`. The existing `showSaveToast` / `secSaveToast` mechanism is
  restyled in place — **no toast library is added**. The three bare
  `alert()` calls on save failure become inline error state.
- **`ManagerDashboard`** — panels to `Card`; provisioning form to `Input` +
  `Label` + `Button`; roster table to `Table`. **Defect 2's preservation
  rule governs this file.**

## Testing

- **Playwright** — `e2e/auth-gate.spec.ts` passes unmodified, run before
  and after step 1 and again at the end.
- **Vitest characterization tests** — written *before* each refactor and
  verified against both pre- and post-refactor code using the
  `git stash push -- <file>` / `git stash pop` technique from 7a. That
  double-run is what proves a test characterizes behavior rather than
  passing by accident. New files: `LoginGate.test.tsx`,
  `ProfileSetupDialog.test.tsx`, `Sidebar.test.tsx` (role filtering, drawer
  open and close), `Header.test.tsx` (each panel opens; accessibility
  controls still write to `AccessibilityContext`), and
  `ManagerDashboard.test.tsx`, whose first assertion is that the
  k-anonymity overlay appears below the floor and clears above it.
- **Manual pass per step** via `npm run dev`: high-contrast mode, dyslexic
  font, and each font-scale step; plus a mobile-viewport check of the
  drawer and both Header panels, where the restructuring is concentrated.

## Risks

**`Header` is the high risk** — 745 lines, three panels, a portalled video
surface, and `localStorage` that must be copied across untouched. It is the
largest file in the slice and the one where a subtle mobile regression is
easiest to miss. Mitigated by ordering: it runs second, after the
e2e-guarded shell split has proven the pattern, and it gets its own full
gate before `Sidebar` starts.

**Scope creep into 7c is the quiet risk.** `app/page.tsx` sits directly on
top of nine unmigrated widgets, and "while I'm here" is how a 3,300-line
slice becomes a 6,700-line one. The `focus-dimming-card glass-card` wrapper
divs are the boundary.

**Defect 2 is the correctness risk.** A migration that tidies away the
Simulate Submissions control would convert a documented Phase 8 gap into a
silent one. The preservation rule exists to prevent that.

## Exit criteria

- All 8 in-scope files render via shadcn primitives; no hand-built dropdown,
  drawer, or modal overlay remains in the shell.
- `e2e/auth-gate.spec.ts` passes unmodified.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build` are
  all clean.
- Five new Vitest files exist, each verified against pre- and post-refactor
  code.
- The three known defects are unchanged in behavior, and Defect 2 carries an
  in-code comment pointing at its Phase 8 task.
- No file in the 7c list has been opened.
