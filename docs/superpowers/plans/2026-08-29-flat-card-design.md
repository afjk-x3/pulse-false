# Flat Card Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app-wide `.glass-card` glassmorphism treatment (translucency, blur, layered glow shadow, hover-lift) with a flat, opaque card surface — a single CSS-only change to `app/globals.css` that updates all 18 consuming files with no per-file edits.

**Architecture:** `.glass-card` is one shared utility class plus two `:root` custom properties (`--card-bg`, `--border-color`). Redefining those three things in `app/globals.css` propagates everywhere the class is used, including shadcn's `--card` token (already aliased to `--card-bg`). No application code, no new tests — this is a value-only CSS change.

**Tech Stack:** Tailwind CSS 4 (CSS-first, `app/globals.css`).

**Spec:** [docs/superpowers/specs/2026-08-29-flat-card-design.md](../specs/2026-08-29-flat-card-design.md)

## Global Constraints

- Only `app/globals.css` and `docs/11-design-system.md` change. No file among the 18 consumers of `.glass-card` is touched.
- Modal dimming scrims (`bg-black/40 backdrop-blur-md` and similar, in `AppShell.tsx`, `CalendarGuard.tsx`, `Header.tsx`, `KudosFeed.tsx`) are explicitly out of scope — do not touch them.
- The k-anonymity blur overlays (`KAnonymityEmptyState.tsx`, `ManagerDashboard.tsx`) are explicitly out of scope — blur there is a privacy mechanism, not decoration. This plan's token changes don't alter their blur behavior (only the `--card-bg` tint they layer on top of shifts slightly), but no code in those two files is edited.
- `npm run lint` and `npx tsc --noEmit` must stay clean (per `AGENTS.md`) — expected to be a no-op check here since no `.ts`/`.tsx` file changes, included for safety.

---

### Task 1: Flatten `.glass-card` and its backing tokens

**Files:**
- Modify: `app/globals.css`
- Modify: `docs/11-design-system.md`

**Interfaces:** None — this task has no consumers within this plan; it's the only task, and no other file's code depends on any name introduced here (the token and class names are unchanged, only their values/rules are).

- [ ] **Step 1: Update the `:root` tokens**

In `app/globals.css`, the `:root` block currently reads (around line 42):

```css
  --card-bg: rgba(255, 255, 255, 0.6);
  --border-color: rgba(255, 255, 255, 0.5);
```

Change it to:

```css
  --card-bg: #ffffff;
  --border-color: #dcdcd6;
```

- [ ] **Step 2: Flatten the `.glass-card` utility and drop its hover-lift**

In `app/globals.css`, the block currently reads (around line 207):

```css
.glass-card {
  background-color: var(--card-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 24px -6px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.4);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease, border-color 0.3s ease;
}

body.high-contrast .glass-card {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  box-shadow: none;
  border-width: 1.5px;
  border-color: #000;
  background-color: #fff;
}

.glass-card:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.6);
  border-color: rgba(255,255,255,0.8);
}
```

Replace it with:

```css
.glass-card {
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  box-shadow: 0 1px 3px rgba(28, 37, 46, 0.08);
  transition: border-color 0.2s ease;
}

body.high-contrast .glass-card {
  box-shadow: none;
  border-width: 1.5px;
  border-color: #000;
  background-color: #fff;
}
```

(The `.glass-card:hover:not(:disabled)` rule is deleted entirely — no replacement block.)

- [ ] **Step 3: Update the design-system doc**

In `docs/11-design-system.md`, the base-palette bullet currently reads:

```markdown
- Base palette: background `#f4f6f8`, foreground `#1c252e`, card background
  `rgba(255,255,255,0.6)` (glass effect), border `rgba(255,255,255,0.5)`.
```

Change it to:

```markdown
- Base palette: background `#f4f6f8`, foreground `#1c252e`, card background
  `#ffffff` (opaque), border `#dcdcd6`.
```

And the "Rules for extending this system" bullet currently reads:

```markdown
- Card surfaces use the existing `glass-card` / `bg-card-bg` pattern for
  visual consistency across dashboards.
```

Change it to:

```markdown
- Card surfaces use the existing `glass-card` / `bg-card-bg` pattern for
  visual consistency across dashboards: opaque white background, a
  hairline border, and a single soft flat shadow — no transparency, blur,
  or hover motion.
```

- [ ] **Step 4: Verify build, type check, and lint stay clean**

Run:
```bash
npm run build
npx tsc --noEmit
npm run lint
```
Expected: all three exit 0. No `.ts`/`.tsx` file changed, so this step is a safety net confirming the CSS edit didn't somehow break the build (e.g. a syntax error in the CSS), not a check that's expected to catch anything substantive.

- [ ] **Step 5: Manual visual verification**

Run `npm run dev`, log in, and check a sample of routes covering the 18 affected files:
- `/` (dashboard — `app/page.tsx`)
- `/privacy` (`PrivacyCenter.tsx`)
- `/settings` (`SettingsView.tsx`)
- `/kudos` (`KudosFeed.tsx`)
- The manager dashboard (`ManagerDashboard.tsx`, reachable via a manager-role login)

On each: confirm cards render opaque white with a visible light-gray hairline border and a subtle, single-layer shadow — no blur, no glowing edge, no upward lift on hover. Toggle high-contrast mode (Settings page) and confirm cards still render solid white with a black border, matching pre-change behavior.

Separately, load the k-anonymity empty state (a `ManagerDashboard` or `KAnonymityEmptyState` view where a cohort is below the reporting threshold) and confirm the blur-obscured placeholder still blurs correctly — this route's code is untouched, but it reads `--card-bg`, so this step confirms the token change didn't visibly break its masking effect.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css docs/11-design-system.md
git commit -m "Flatten .glass-card: opaque background, hairline border, no blur or hover-lift"
```

---

## Self-Review Notes

- **Spec coverage:** every element of the spec's Design section (both `:root` tokens, the `.glass-card` rule, the `body.high-contrast` override, the doc update) has a corresponding step. The spec's Testing/Verification section maps directly to Steps 4-5. The Out of Scope section is enforced by this plan touching only 2 files, neither of which is a scrim or k-anonymity file.
- **Placeholder scan:** no TBD/TODO; every step has literal before/after code or exact commands.
- **Type consistency:** N/A — no functions, types, or interfaces are introduced or consumed across steps; this is a single self-contained CSS/doc task.
