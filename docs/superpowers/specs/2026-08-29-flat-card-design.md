# Flat card design: remove glassmorphism

## Motivation

The app's card surfaces (`.glass-card` utility in `app/globals.css`) use a
translucent background, `backdrop-filter: blur(16px)`, a layered glow-style
box-shadow, and a hover-lift animation — a glassmorphism treatment. The
product owner dislikes the transparency/glass look and wants a flatter,
more grounded card surface instead, applied app-wide.

## Scope

`.glass-card` is a single shared CSS utility referenced by className in 18
files (every dashboard/feature component in the app — `AdminConsole`,
`AppShell`, `BRIExplainerCard`, `BRIExplanationFeed`, `BurnoutRiskIndex`,
`CalendarGuard`, `CoffeeRoulette`, `KAnonymityEmptyState`, `KudosFeed`,
`ManagerDashboard`, `PrivacyCenter`, `RightToDisconnectOutbox`,
`SentimentTrendLine`, `SettingsView`, `SupportCircles`,
`WebcamCVConsentModal`, `app/inbox/page.tsx`, `app/page.tsx`). Because the
visual treatment is centralized in one CSS rule plus two `:root` custom
properties, this is a CSS-only change: redefining `.glass-card` and its
backing tokens updates the look everywhere the class is used, with no
changes required to any of the 18 consuming files.

**In scope:**
- The `.glass-card` utility class and its `:hover` variant
- The `--card-bg` and `--border-color` custom properties it reads
- The `body.high-contrast` override for both (already close to the target
  look — see Design below)
- shadcn's `--card` token, which already aliases `var(--card-bg)`
  ([app/globals.css:62](../../../app/globals.css)) and therefore updates
  automatically

**Out of scope (confirmed with the product owner):**
- Modal dimming scrims (`bg-black/40 backdrop-blur-md` / `bg-neutral-900/40
  backdrop-blur-sm` behind full-screen modals in `AppShell.tsx`,
  `CalendarGuard.tsx`, `Header.tsx`, `KudosFeed.tsx`) — a standard
  focus-scrim pattern, not the glassmorphism card look, left unchanged.
- k-anonymity blur overlays (`KAnonymityEmptyState.tsx`,
  `ManagerDashboard.tsx`, both using inline `backdrop-blur-md` combined
  with `bg-card-bg/70` or `glass-card/70`) — blur is the actual privacy
  mechanism here (obscuring data when a cohort is too small to show
  safely), not decoration. This change does not touch these usages, and
  changing `--card-bg`'s base value does not alter their blur behavior —
  only the tint underneath it shifts slightly, from a semi-transparent
  white to a very slightly different semi-transparent white (see Design).
- Renaming the `.glass-card` class itself. It stops being "glass" but
  keeps its name, since renaming would require touching all 18 files for
  a purely cosmetic gain. A rename can be a cheap, separate follow-up if
  ever wanted.
- Any component-level `bg-*/NN` translucency used for small inline tints
  (info callouts, badges, hover backgrounds) — e.g. `bg-teal-50/50`,
  `bg-neutral-50/50` scattered through individual components. These are
  unrelated to the card-surface treatment and out of scope for this pass.

## Design

### `app/globals.css` — `:root` tokens (line ~42)

Before:
```css
--card-bg: rgba(255, 255, 255, 0.6);
--border-color: rgba(255, 255, 255, 0.5);
```

After:
```css
--card-bg: #ffffff;
--border-color: #dcdcd6;
```

`--border-color`'s old value was a translucent white highlight designed to
catch light against a glass surface — invisible against solid white. The
new value is a real light-gray hairline, visible on the opaque card
background.

### `app/globals.css` — `.glass-card` utility (line ~207)

Before:
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

After:
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

Changes: drop both `backdrop-filter` declarations, drop the `transform`
half of the transition (nothing animates transform anymore), drop the
`:hover` rule entirely (no lift, no shadow/border change on hover), and
replace the two-layer glow shadow with one flat, low-opacity shadow. The
high-contrast override loses its now-redundant `backdrop-filter: none`
lines (nothing sets a backdrop-filter anymore) but is otherwise unchanged
— it already specified an opaque white background and a solid black
border, which is the same direction the new default styling now takes.

### Net visual effect

Cards go from translucent-with-blur, floating, glowing-edged, and
lift-on-hover, to opaque white, flat, hairline-bordered, with a single
soft contact shadow and no hover motion. Category-color badges/triads
(sage `#EAEFE9`/`#C3D2C1`/`#2F4F2F`, cerulean, terracotta) are unaffected
— they're separate tokens, already opaque, not part of `.glass-card`.

### `docs/11-design-system.md`

Update the base-palette line (currently documents the glass values) and
the "Rules for extending this system" bullet that says cards use "the
existing `glass-card` / `bg-card-bg` pattern for visual consistency" —
still true, but the description of what that pattern *looks like* needs
updating to match the new flat treatment instead of describing a glass
effect.

## Testing / verification

No new automated test is warranted for a pure CSS value change — this
touches no application logic, only `app/globals.css`. Verification is
visual:
- `npm run build` / `npx tsc --noEmit` / `npm run lint` stay clean (no
  application code changes).
- Manual check across a sample of routes covering the 18 affected files
  (at minimum: `/` dashboard, `/privacy`, `/settings`, `/kudos`, the
  manager dashboard, and the k-anonymity empty state) confirming: cards
  render opaque white with a visible hairline border and a subtle shadow;
  no blur; no hover-lift; high-contrast mode still renders solid
  white/black-border cards as it did before.
- Confirm the k-anonymity blur overlays (out of scope) are visually
  unaffected — same blur strength, same rough tint.

## Self-review notes

- **Placeholder scan:** none — every changed value is the literal
  replacement CSS, not a TBD.
- **Internal consistency:** the `--card-bg`/`--border-color` values match
  what's used in the `.glass-card` before/after blocks; the
  `body.high-contrast` block's surviving declarations match what it
  already had (verified against the current file), with only the
  now-meaningless `backdrop-filter: none` lines removed.
- **Scope check:** single spec, single small implementation plan — no
  decomposition needed.
- **Ambiguity check:** the two "out of scope, confirmed" items (modal
  scrims, k-anonymity blur) were explicit product-owner decisions during
  brainstorming, not left ambiguous.
