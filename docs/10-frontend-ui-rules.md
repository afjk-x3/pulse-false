## 10. Frontend UI Rules

1. Every client component keeps the `'use client'` directive at the top,
   matching `AGENTS.md`.
2. No component reads a privacy-relevant flag (camera consent, kill switch
   state) from only localStorage. Always check the Supabase-backed org-wide
   setting first, fall back to local state only for pure UI preferences
   (font scale, high contrast, TTS speed).
3. Any UI element that simulates or mocks data for demo purposes (like the
   current "Simulate Submissions" control in `ManagerDashboard.tsx`) must be
   removed or gated behind a dev-only flag before the surrounding feature
   ships to real users.
4. Accessibility is not optional on new components. Every interactive
   element needs a visible focus state, an `aria-label` where the visible
   text does not fully describe the action, and support for the existing
   `AccessibilityContext` (font scale, dyslexic font, high contrast, reading
   ruler) without a separate opt-in per component.
5. Color and type come from the existing design tokens in `globals.css`
   (see Section 11, Design System). Do not introduce a new one-off color for
   a single component.
