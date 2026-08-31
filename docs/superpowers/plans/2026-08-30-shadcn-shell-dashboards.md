# Phase 7b: shadcn Shell & Dashboards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the shared application shell and the three dashboard routes onto shadcn/ui primitives, preserving all existing behavior including three known backend defects.

**Architecture:** Four sequential stages — add primitives and split `AppShell`; migrate `Header`'s three panels; extract `SidebarNav` and move the mobile drawer to `Sheet`; migrate the three dashboards. Each stage ends with a full verification gate. Extractions are characterized by testing the *parent* before the split, so the same test proves behavior on both sides of the refactor.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind CSS 4, shadcn/ui on Radix, Supabase, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-30-shadcn-shell-dashboards-design.md` (committed as `72d8f3d`)

## Global Constraints

Every task's requirements implicitly include this section.

- **Work directly on `master` in the main checkout.** Do not create a git worktree.
- **`e2e/auth-gate.spec.ts` must pass unmodified.** Never edit that file. Four strings are frozen verbatim: heading `Welcome back`, labels `Work Email` and `Password`, button `Sign In to Portal`. The `required` attribute stays on both login inputs.
- **Preserve, do not fix, three known backend defects.** (1) `user_profiles` has no colleague-directory read path, so `/manager` renders an empty roster for non-admins — this is expected after 7b, not a regression. (2) `/manager`'s k-anonymity gate is demo scaffolding. (3) `Header`'s `pulse-cv-active` / `pulse-cv-consent` localStorage flags are never reconciled with `webcam_cv_global_disabled`. Copy all three across verbatim in behavior.
- **Never open a Phase 7c file.** Off limits: `CalendarGuard.tsx`, `RightToDisconnectOutbox.tsx`, `SentimentTrendLine.tsx`, `BurnoutRiskIndex.tsx`, `BRIExplanationFeed.tsx`, `WindDownRoutine.tsx`, `BRIExplainerCard.tsx`, `KAnonymityEmptyState.tsx`, `MeetingTimeline.tsx`, `SentimentWidget.tsx`, `MicroCoachingNudge.tsx`.
- **No RLS, migration, `database.types.ts`, or query-shape changes.** Presentation layer only.
- **No React Server Components refactor.** Moving `app/page.tsx` to RSC is a separate Phase 7 task. Mixing a client/server boundary change into a presentation migration would make any regression impossible to attribute. Every file that is a client component today stays one.
- **No new dependency beyond what `npx shadcn@latest add` pulls in.** Specifically: no toast library.
- **Client components keep `'use client'`** at the top of every file that has it today, and every new component file created here.
- **Card layering pattern** (established in 7a): to keep the app's flat card look on a shadcn `Card`, use `className="bg-transparent border-transparent shadow-none glass-card"`.
- **Full gate between stages:** `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`. All four clean before the next stage starts.
- **Do not use `git commit --no-verify`.** If a hook fails, fix the cause.

---

## File Structure

**Created:**

| File | Responsibility |
| --- | --- |
| `app/components/LoginGate.tsx` | Split-screen sign-in form. Presentational; no auth logic. |
| `app/components/ProfileSetupDialog.tsx` | First-login profile modal as a shadcn `Dialog`. |
| `app/components/SidebarNav.tsx` | Role-filtered nav list, rendered in both the desktop aside and the mobile `Sheet`. |
| `app/components/HeaderNotificationsPanel.tsx` | Notifications panel contents, shared by `Popover` and `Sheet`. |
| `app/components/HeaderAccessibilityPanel.tsx` | Accessibility hub contents, shared by `Popover` and `Sheet`. |
| `app/components/ui/{dropdown-menu,sheet,table,tooltip,label,alert,badge}.tsx` | shadcn primitives, CLI-generated. |
| `app/components/LoginGate.test.tsx` | Characterization tests for the sign-in form. |
| `app/components/ProfileSetupDialog.test.tsx` | Characterization tests for the setup modal. |
| `app/components/Sidebar.test.tsx` | Role filtering and drawer open/close. |
| `app/components/Header.test.tsx` | Panel opening; accessibility controls still write to context. |
| `app/components/ManagerDashboard.test.tsx` | k-anonymity overlay above and below the floor. |

**Modified:** `app/components/AppShell.tsx`, `Header.tsx`, `Sidebar.tsx`, `WebcamCVConsentModal.tsx`, `app/page.tsx`, `ManagerDashboard.tsx`, `AdminConsole.tsx`, `UserManagement.tsx`.

---

## A note on characterizing an extraction

Tasks 2, 3 and 8 extract a component out of a larger file. A test that imports `LoginGate` cannot run before `LoginGate` exists, so it cannot characterize anything.

The correct sequence, used in those tasks:

1. Write the test against the **parent** (`AppShell`, `Sidebar`) exercising the behavior about to move.
2. Run it — it must **PASS** against the current, un-refactored code. That is what proves it describes real behavior.
3. Perform the extraction.
4. Run the same unmodified test again — it must still pass. Same test, both sides of the refactor.

For a pure in-place migration (Tasks 5–7, 9–12) the same order applies and is simpler: write the test, run it against the current component and confirm it **passes**, then refactor, then run the unmodified test again.

7a used `git stash push -- <file>` / `git stash pop` because there the tests were written *after* the refactor was already in the working tree, so stashing was the only way to see them run against the original. Here every test is written first, so the pre-refactor run gives the same guarantee directly and no stashing is needed. Do not add stash steps — a stash that reverts nothing proves nothing.

The rule that matters, in both shapes: **a characterization test that has never been seen to pass against the original code is not a characterization test.** If a test fails before the refactor, fix the test, not the component.

---

## Task 1: Add the seven shadcn primitives

**Files:**
- Create: `app/components/ui/dropdown-menu.tsx`, `sheet.tsx`, `table.tsx`, `tooltip.tsx`, `label.tsx`, `alert.tsx`, `badge.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`; `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`; `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`; `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`; `Label`; `Alert`, `AlertTitle`, `AlertDescription`; `Badge`.

- [ ] **Step 1: Confirm which primitives are actually missing**

```bash
ls app/components/ui/
```

Expected: `button, card, command, dialog, input-group, input, popover, select, slider, switch, textarea`. None of the seven being added should appear. If any does, skip it in Step 2 — do not overwrite a file customised during 7a.

- [ ] **Step 2: Add the components**

The CLI prompts to overwrite when a registry entry bundles a file that already exists. Answer `n` — 7a customised `button.tsx`, `input.tsx`, and `dialog.tsx`.

```bash
echo "n" | npx shadcn@latest add dropdown-menu sheet table tooltip label alert badge
```

- [ ] **Step 3: Verify nothing existing was overwritten**

```bash
git status --short app/components/ui/
```

Expected: only the seven new files appear as untracked (`??`). If any pre-existing `ui/` file shows as modified (` M`), restore it: `git checkout -- app/components/ui/<file>.tsx`.

- [ ] **Step 4: Verify the build still compiles**

```bash
npx tsc --noEmit && npm run lint
```

Expected: both clean, no output.

- [ ] **Step 5: Commit**

```bash
git add app/components/ui/
git commit -m "Add shadcn DropdownMenu, Sheet, Table, Tooltip, Label, Alert, and Badge for the Phase 7b shell migration"
```

---

## Task 2: Extract `LoginGate`

**Files:**
- Create: `app/components/LoginGate.tsx`, `app/components/LoginGate.test.tsx`
- Modify: `app/components/AppShell.tsx` (removes the `!currentUser || !session` render branch)

**Interfaces:**
- Consumes: `Button` from `./ui/button`, `Input` from `./ui/input`, `Label` from `./ui/label`, `Alert`/`AlertDescription` from `./ui/alert`.
- Produces:

```tsx
interface LoginGateProps {
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
}
export default function LoginGate(props: LoginGateProps): React.ReactElement;
```

- [ ] **Step 1: Write the characterization test against the current `AppShell`**

Create `app/components/LoginGate.test.tsx`. It renders `AppShell` — not `LoginGate`, which does not exist yet — so it can run before the extraction.

```tsx
import type { ReactElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AppShell from './AppShell';
import { AccessibilityProvider } from '../context/AccessibilityContext';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      return chain;
    }),
  },
}));

function renderWithAccessibility(ui: ReactElement) {
  return render(<AccessibilityProvider>{ui}</AccessibilityProvider>);
}

describe('sign-in gate', () => {
  it('renders the four strings the Playwright suite asserts on', async () => {
    renderWithAccessibility(<AppShell>{null}</AppShell>);

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByLabelText('Work Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In to Portal' })).toBeInTheDocument();
  });

  it('keeps both credential fields required', async () => {
    renderWithAccessibility(<AppShell>{null}</AppShell>);

    expect(await screen.findByLabelText('Work Email')).toBeRequired();
    expect(screen.getByLabelText('Password')).toBeRequired();
  });

  it('does not render dashboard content to a logged-out visitor', async () => {
    renderWithAccessibility(<AppShell><p>secret dashboard</p></AppShell>);

    await screen.findByRole('heading', { name: 'Welcome back' });
    expect(screen.queryByText('secret dashboard')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it against the un-refactored code**

```bash
npx vitest run app/components/LoginGate.test.tsx
```

Expected: **PASS, 3 tests.** This is the critical checkpoint — the test must pass *before* the extraction. If it fails, the test is wrong, not the code. Fix the test and repeat until green.

- [ ] **Step 3: Create `LoginGate.tsx`**

Move the markup from the `if (!currentUser || !session)` branch of `AppShell.tsx` (currently lines ~193–229). The left-hand branding column moves across verbatim. The form becomes:

```tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';

interface LoginGateProps {
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
}

export default function LoginGate({
  email, onEmailChange, password, onPasswordChange, error, onSubmit,
}: LoginGateProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="block text-xs font-bold text-neutral-700">
            Work Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="e.g. alex.rivera@axionhr.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            required
            className="p-3.5 rounded-xl text-sm glass-card font-medium h-auto"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="block text-xs font-bold text-neutral-700">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            required
            className="p-3.5 rounded-xl text-sm glass-card font-medium h-auto"
          />
        </div>
      </div>
      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" className="w-full py-3.5 h-auto rounded-xl text-sm font-bold">
        Sign In to Portal
      </Button>
    </form>
  );
}
```

The surrounding two-column layout, the `lg:hidden` mobile logo block, and the `Welcome back` heading stay in `LoginGate.tsx` around this form — move them across from `AppShell` unchanged. `Label` must keep `htmlFor` matching each input's `id`, or `getByLabelText` and Playwright's `getByLabel` both break.

- [ ] **Step 4: Wire it into `AppShell`**

Replace the whole `if (!currentUser || !session) { return (...) }` branch body with:

```tsx
  if (!currentUser || !session) {
    return (
      <LoginGate
        email={emailInput}
        onEmailChange={setEmailInput}
        password={passwordInput}
        onPasswordChange={setPasswordInput}
        error={loginError}
        onSubmit={handleFormSubmit}
      />
    );
  }
```

Add `import LoginGate from './LoginGate';` at the top. `handleFormSubmit`, `emailInput`, `passwordInput`, and `loginError` all stay in `AppShell` — only the markup moves.

- [ ] **Step 5: Run the same test again, unmodified**

```bash
npx vitest run app/components/LoginGate.test.tsx
```

Expected: **PASS, 3 tests.** Same file, unedited, now passing against the refactored code. That is the proof the extraction preserved behavior.

- [ ] **Step 6: Run the Playwright suite**

```bash
npm run test:e2e
```

Expected: **3 passed.** Playwright starts its own dev server via `webServer` in `playwright.config.ts`. If any of the three fails, a frozen string or the `required` attribute was lost — fix `LoginGate.tsx`, never `e2e/auth-gate.spec.ts`.

- [ ] **Step 7: Commit**

```bash
git add app/components/LoginGate.tsx app/components/LoginGate.test.tsx app/components/AppShell.tsx
git commit -m "Extract LoginGate from AppShell onto shadcn Input, Label, Button, and Alert"
```

---

## Task 3: Extract `ProfileSetupDialog`

**Files:**
- Create: `app/components/ProfileSetupDialog.tsx`, `app/components/ProfileSetupDialog.test.tsx`
- Modify: `app/components/AppShell.tsx` (removes the `setupIncomplete` overlay block)

**Interfaces:**
- Consumes: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` from `./ui/dialog`; `Input`, `Label`, `Button`, `Alert`.
- Produces:

```tsx
interface ProfileSetupDialogProps {
  open: boolean;
  currentUser: { id: string; full_name: string; email: string };
  onSaved: () => void;
}
export default function ProfileSetupDialog(props: ProfileSetupDialogProps): React.ReactElement;
```

- [ ] **Step 1: Write the characterization test**

Create `app/components/ProfileSetupDialog.test.tsx`. Like Task 2, it renders `AppShell` so it can run pre-extraction. The setup modal shows when a logged-in profile has no `phone`.

```tsx
import type { ReactElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AppShell from './AppShell';
import { AccessibilityProvider } from '../context/AccessibilityContext';

const PROFILE_WITHOUT_PHONE = {
  id: 'user-1',
  full_name: 'Sam Employee',
  email: 'sam@axionhr.com',
  role: 'employee',
  phone: null,
};

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } },
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn(),
    },
    from: vi.fn((table: string) => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        update: vi.fn(() => chain),
        single: vi.fn().mockResolvedValue({
          data: table === 'user_profiles' ? PROFILE_WITHOUT_PHONE : { emergency_kill_switch: false },
          error: null,
        }),
      };
      return chain;
    }),
  },
}));

function renderWithAccessibility(ui: ReactElement) {
  return render(<AccessibilityProvider>{ui}</AccessibilityProvider>);
}

describe('profile setup gate', () => {
  it('prompts for setup when the profile has no phone number', async () => {
    renderWithAccessibility(<AppShell>{null}</AppShell>);

    expect(
      await screen.findByRole('heading', { name: /complete your profile setup/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toHaveValue('Sam Employee');
    expect(screen.getByLabelText(/phone number/i)).toBeRequired();
  });

  it('shows the work email as a disabled field', async () => {
    renderWithAccessibility(<AppShell>{null}</AppShell>);

    const email = await screen.findByLabelText(/work email/i);
    expect(email).toBeDisabled();
    expect(email).toHaveValue('sam@axionhr.com');
  });
});
```

- [ ] **Step 2: Run it against the un-refactored code**

```bash
npx vitest run app/components/ProfileSetupDialog.test.tsx
```

Expected: **PASS, 2 tests.**

Note: today's markup uses bare `<label>` elements with no `htmlFor`, so `getByLabelText` may not resolve. If Step 2 fails for that reason, that is a real finding — the current fields are not programmatically labelled. Adjust the test to query by `name` attribute via `container.querySelector('input[name="phone"]')` to get it green pre-refactor, then in Step 3 add proper `Label htmlFor` pairs and **switch the test back to `getByLabelText`**, noting in the commit message that the migration fixed unlabelled inputs.

- [ ] **Step 3: Create `ProfileSetupDialog.tsx`**

```tsx
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { supabase } from '../lib/supabaseClient';

interface ProfileSetupDialogProps {
  open: boolean;
  currentUser: { id: string; full_name: string; email: string };
  onSaved: () => void;
}

export default function ProfileSetupDialog({ open, currentUser, onSaved }: ProfileSetupDialogProps) {
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const pName = formData.get('name') as string;
    const pPhone = formData.get('phone') as string;
    const pAddress = formData.get('address') as string;

    if (!pName || !pPhone) return;

    setIsSaving(true);
    setError('');
    try {
      await supabase.from('user_profiles').update({
        full_name: pName.trim(),
        phone: pPhone.trim(),
        address: pAddress ? pAddress.trim() : null,
      }).eq('id', currentUser.id);
      onSaved();
    } catch {
      setError('Failed to save profile setup.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Complete Your Profile Setup</DialogTitle>
          <DialogDescription className="text-xs">
            First-time login setup: Please verify and fill out your required profile information.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="setup-name" className="block text-xs font-bold">Full Name *</Label>
            <Input id="setup-name" name="name" type="text" defaultValue={currentUser.full_name} required className="text-xs font-semibold" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="setup-email" className="block text-xs font-bold">Work Email (Read-only)</Label>
            <Input id="setup-email" type="email" value={currentUser.email} disabled className="text-xs font-semibold" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="setup-phone" className="block text-xs font-bold">Phone Number *</Label>
            <Input id="setup-phone" name="phone" type="tel" required className="text-xs font-semibold" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="setup-address" className="block text-xs font-bold">Residential Address (Optional)</Label>
            <Input id="setup-address" name="address" type="text" className="text-xs font-semibold" />
          </div>
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={isSaving} className="w-full py-2.5 h-auto rounded-xl text-xs font-bold">
            {isSaving ? 'Saving...' : 'Access Portal'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

The `alert()` on failure is replaced by inline `Alert` state, matching every other form in the app. If `DialogContent` in this repo does not accept `showCloseButton`, omit that prop — the dialog is non-dismissible by virtue of having no `onOpenChange`.

- [ ] **Step 4: Wire it into `AppShell`**

Delete the entire `{setupIncomplete && ( ... )}` block at the bottom of `AppShell.tsx` and replace with:

```tsx
      {setupIncomplete && (
        <ProfileSetupDialog
          open={setupIncomplete}
          currentUser={currentUser}
          onSaved={triggerRefresh}
        />
      )}
```

Add `import ProfileSetupDialog from './ProfileSetupDialog';`. Leave `const setupIncomplete = Boolean(currentUser && !currentUser.phone);` exactly as it is.

- [ ] **Step 5: Run the test again**

```bash
npx vitest run app/components/ProfileSetupDialog.test.tsx
```

Expected: **PASS, 2 tests.**

- [ ] **Step 6: Commit**

```bash
git add app/components/ProfileSetupDialog.tsx app/components/ProfileSetupDialog.test.tsx app/components/AppShell.tsx
git commit -m "Extract ProfileSetupDialog from AppShell onto shadcn Dialog"
```

---

## Task 4: Finish `AppShell` and gate stage 1

**Files:**
- Modify: `app/components/AppShell.tsx`

**Interfaces:**
- Consumes: `Alert`, `AlertDescription` from `./ui/alert`.
- Produces: `AppShell` default export and the `AuthContext` named export, both unchanged in signature.

- [ ] **Step 1: Convert the system-paused banner to `Alert`**

Replace the `{systemPaused && (<div className="w-full bg-red-600 ...">...</div>)}` block with:

```tsx
        {systemPaused && (
          <Alert
            variant="destructive"
            className="w-full rounded-none border-x-0 border-t-0 py-3.5 px-6 flex items-center justify-center gap-2 animate-slide-down"
          >
            <AlertDescription className="text-xs font-extrabold flex items-center gap-2">
              <span className="inline-block p-1 bg-red-800 rounded-md">⚠️ SYSTEM PORTAL PAUSED</span>
              <span>Corporate administration has suspended all well-being telemetry org-wide.</span>
            </AlertDescription>
          </Alert>
        )}
```

Both strings are preserved verbatim. Leave the `authLoading` bouncing-dots branch untouched — it is decoration with no primitive to gain from.

- [ ] **Step 2: Confirm `AuthContext` is unchanged**

```bash
grep -n "export const AuthContext" app/components/AppShell.tsx
```

Expected: `export const AuthContext = React.createContext<any>(null);` — same line, same shape. Every route consumes it; it must not move.

- [ ] **Step 3: Full gate**

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build
```

Expected: lint silent, tsc silent, all Vitest files pass, build succeeds for all 13 routes.

- [ ] **Step 4: Playwright**

```bash
npm run test:e2e
```

Expected: **3 passed**, `e2e/auth-gate.spec.ts` unmodified.

- [ ] **Step 5: Manual pass**

Run `npm run dev`. Confirm at the sign-in screen: high-contrast mode renders readable text, the dyslexic font applies, and each font-scale step reflows without clipping.

- [ ] **Step 6: Commit**

```bash
git add app/components/AppShell.tsx
git commit -m "Convert AppShell system-paused banner to shadcn Alert"
```

---

## Task 5: `Header` — notifications panel

**Files:**
- Create: `app/components/HeaderNotificationsPanel.tsx`, `app/components/Header.test.tsx`
- Modify: `app/components/Header.tsx`

**Interfaces:**
- Consumes: `Popover`, `PopoverTrigger`, `PopoverContent` from `./ui/popover`; `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` from `./ui/sheet`; `Button`.
- Produces:

```tsx
interface HeaderNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}
interface HeaderNotificationsPanelProps {
  notifications: HeaderNotification[];
  onClose: () => void;
}
export default function HeaderNotificationsPanel(props: HeaderNotificationsPanelProps): React.ReactElement;
```

- [ ] **Step 1: Write the characterization test**

Create `app/components/Header.test.tsx`. This file grows across Tasks 5–7; start with the notifications case.

```tsx
import type { ReactElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from './Header';
import { AccessibilityProvider } from '../context/AccessibilityContext';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: vi.fn(() => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        limit: vi.fn(() => chain),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      return chain;
    }),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
}));

const CURRENT_USER = { id: 'user-1', full_name: 'Sam Employee', email: 'sam@axionhr.com', role: 'employee' };

function renderHeader(ui: ReactElement) {
  return render(<AccessibilityProvider>{ui}</AccessibilityProvider>);
}

describe('Header', () => {
  it('renders the page title it is given', () => {
    renderHeader(<Header title="Guardian Dashboard" currentUser={CURRENT_USER} onLogout={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Guardian Dashboard' })).toBeInTheDocument();
  });

  it('opens the notifications panel from its trigger', async () => {
    const user = userEvent.setup();
    renderHeader(<Header title="Guardian Dashboard" currentUser={CURRENT_USER} onLogout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    expect(await screen.findByText(/no new notifications/i)).toBeInTheDocument();
  });
});
```

Adjust the empty-state string in the second test to whatever `Header.tsx` actually renders when `notifications` is empty — read it first with `grep -n "notification" app/components/Header.tsx`. Do not invent copy.

- [ ] **Step 2: Verify the test passes against the current code**

```bash
npx vitest run app/components/Header.test.tsx
```

Expected: **PASS, 2 tests.** If `scrollIntoView` or `ResizeObserver` errors appear, the polyfills in `vitest.setup.ts` already cover both — re-read that file before adding anything new.

- [ ] **Step 3: Extract the panel contents**

Create `HeaderNotificationsPanel.tsx` holding the markup currently inside the notifications dropdown `<div>` (`Header.tsx` lines ~348–395): the header row with the `Bell` icon and "Notifications" label, the close button wired to `onClose`, and the notification list with its empty state. Move it verbatim; only the outer positioning wrapper is left behind.

- [ ] **Step 4: Render it responsively in `Header.tsx`**

Radix `Popover` positions itself with inline transforms, so the mobile centred overlay cannot be reproduced with CSS on `PopoverContent`. Render both, gated by CSS visibility on the wrappers:

```tsx
{/* Desktop: anchored popover */}
<div className="hidden sm:block">
  <Popover open={isNotifMenuOpen} onOpenChange={setIsNotifMenuOpen}>
    <PopoverTrigger asChild>
      <Button variant="ghost" size="icon" aria-label="Notifications" className="rounded-full relative">
        <Bell className="h-5 w-5" />
        {notifications.filter(n => !n.read).length > 0 && (
          <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-80 p-5 max-h-[60vh] overflow-y-auto">
      <HeaderNotificationsPanel notifications={notifications} onClose={() => setIsNotifMenuOpen(false)} />
    </PopoverContent>
  </Popover>
</div>

{/* Mobile: centred sheet */}
<div className="sm:hidden">
  <Sheet open={isNotifMenuOpen} onOpenChange={setIsNotifMenuOpen}>
    <SheetTrigger asChild>
      <Button variant="ghost" size="icon" aria-label="Notifications" className="rounded-full relative">
        <Bell className="h-5 w-5" />
        {notifications.filter(n => !n.read).length > 0 && (
          <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </Button>
    </SheetTrigger>
    <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto p-5">
      <SheetHeader className="sr-only"><SheetTitle>Notifications</SheetTitle></SheetHeader>
      <HeaderNotificationsPanel notifications={notifications} onClose={() => setIsNotifMenuOpen(false)} />
    </SheetContent>
  </Sheet>
</div>
```

Both branches share `isNotifMenuOpen`, so only one is visible at a time — but both render a trigger into the DOM, so `getByRole('button', { name: /notifications/i })` now matches two elements and throws. Update the Step 1 test to `getAllByRole('button', { name: /notifications/i })[0]`.

Do **not** reach for `aria-hidden` on the hidden wrapper to make the query unique: both triggers are real controls, and `aria-hidden` on a focusable element hides it from assistive tech while leaving it in the tab order — a worse accessibility state than the hand-built code being replaced.

Delete the two `fixed inset-0` click-catcher divs and the `z-[100]` / `z-[101]` classes — Radix portals to `body` and manages stacking itself.

- [ ] **Step 5: Verify against the refactor**

```bash
npx vitest run app/components/Header.test.tsx
```

Expected: **PASS, 2 tests.**

- [ ] **Step 6: Commit**

```bash
git add app/components/HeaderNotificationsPanel.tsx app/components/Header.test.tsx app/components/Header.tsx
git commit -m "Migrate Header notifications onto shadcn Popover and Sheet"
```

---

## Task 6: `Header` — accessibility hub

**Files:**
- Create: `app/components/HeaderAccessibilityPanel.tsx`
- Modify: `app/components/Header.tsx`, `app/components/Header.test.tsx`

**Interfaces:**
- Consumes: `useAccessibility` from `../context/AccessibilityContext`; `Slider`, `Select`, `Switch`, `Button`, `Popover`, `Sheet`.
- Produces: `export default function HeaderAccessibilityPanel(): React.ReactElement` — takes no props; reads and writes `AccessibilityContext` directly, exactly as `Header` does today.

- [ ] **Step 1: Add the characterization test**

Append to `app/components/Header.test.tsx`:

```tsx
  it('accessibility controls still write through to the context', async () => {
    const user = userEvent.setup();
    renderHeader(<Header title="Guardian Dashboard" currentUser={CURRENT_USER} onLogout={vi.fn()} />);

    await user.click(screen.getAllByRole('button', { name: /accessibility/i })[0]);
    await user.click(await screen.findByRole('button', { name: /high contrast/i }));

    expect(document.body).toHaveClass('high-contrast');
  });
```

Read `Header.tsx` first and match the real accessible name of the high-contrast control. If it is a toggle rendered as a `<button>` with text, `getByRole('button', { name: ... })` works; if it becomes a `Switch` in Step 3, the role changes to `switch` — update the query in Step 5, not now.

- [ ] **Step 2: Verify it passes pre-refactor**

```bash
npx vitest run app/components/Header.test.tsx
```

Expected: **PASS, 3 tests.**

- [ ] **Step 3: Extract the panel as a `Popover`, not a `DropdownMenu`**

This is spec Decision 4 and the single most important call in this task. The hub contains two range sliders and a `<select>`. `DropdownMenuItem` captures arrow keys and closes on select, which would break every control inside it. Use `Popover`.

Create `HeaderAccessibilityPanel.tsx` containing the hub's current contents, with these swaps:

- Both `<input type="range">` (Speech Speed, Speech Pitch) become `Slider`:

```tsx
<Slider
  min={0.5}
  max={2.0}
  step={0.1}
  value={[ttsSpeed]}
  onValueChange={([v]) => setTtsSpeed(v)}
  aria-label="Speech Speed"
/>
```

Note `Slider` takes and returns an **array**; the raw input took a scalar. Keep the `aria-label` strings `Speech Speed` and `Speech Pitch` verbatim.

- The Nudge Delivery Style `<select>` becomes `Select`, preserving all four option values (`toast`, `glow`, `push`, `off`) and their labels (`Toast Notification`, `Ambient Edge-Glow`, `Web Push Notification`, `Off / Disabled`).
- The boolean toggle rows (dyslexic font, reading ruler, high contrast, TTS enabled) become `Switch`, each with a `Label`.
- The font-scale control keeps its current three-state form.

All state stays in `AccessibilityContext` — `openDyslexic`, `readingRuler`, `highContrast`, `fontScale`, `ttsEnabled`, `ttsSpeed`, `ttsPitch`, `nudgeStyle` and their setters. Nothing moves.

- [ ] **Step 4: Render responsively in `Header.tsx`**

Same dual-render pattern as Task 5 — `Popover` inside `hidden sm:block`, `Sheet` inside `sm:hidden`, both bound to `isAccessMenuOpen`. Remove the `isAccessMenuOpen ? 'z-[70]' : 'z-50'` conditional from the `<header>` element; Radix no longer needs the header lifted.

- [ ] **Step 5: Update the query if the control became a `Switch`**

If the high-contrast control is now a `Switch`, change the test's query to:

```tsx
    await user.click(await screen.findByRole('switch', { name: /high contrast/i }));
```

- [ ] **Step 6: Verify**

```bash
npx vitest run app/components/Header.test.tsx
```

Expected: **PASS, 3 tests.**

- [ ] **Step 7: Commit**

```bash
git add app/components/HeaderAccessibilityPanel.tsx app/components/Header.tsx app/components/Header.test.tsx
git commit -m "Migrate Header accessibility hub onto shadcn Popover, Slider, Select, and Switch

Popover rather than DropdownMenu: the hub holds sliders and a select, and
DropdownMenuItem captures arrow keys and closes on select, which would
break every control inside it."
```

---

## Task 7: `Header` — profile menu, consent dialog, and gate stage 2

**Files:**
- Modify: `app/components/Header.tsx`, `app/components/WebcamCVConsentModal.tsx`

**Interfaces:**
- Consumes: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`; `Dialog` family.
- Produces: `WebcamCVConsentModal` keeps its existing props signature — read it with `grep -n "interface\|Props" app/components/WebcamCVConsentModal.tsx` and do not change it.

- [ ] **Step 1: Convert the profile menu to `DropdownMenu`**

This one *is* a genuine action menu (Sign Out and any nav items), so `DropdownMenu` is correct here where it was wrong for the hub.

```tsx
<DropdownMenu open={isMobileProfileMenuOpen} onOpenChange={setIsMobileProfileMenuOpen}>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" className="rounded-full p-1" aria-label="Open profile menu">
      {/* existing avatar markup, moved verbatim */}
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-56">
    {/* existing menu rows become DropdownMenuItem */}
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={onLogout} className="text-red-600 focus:text-red-600">
      <LogOut className="h-4 w-4" />
      <span>Sign Out</span>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

Keep the string `Sign Out` verbatim. Delete the remaining `fixed inset-0` click-catcher.

- [ ] **Step 2: Convert `WebcamCVConsentModal` to `Dialog`**

Open `app/components/WebcamCVConsentModal.tsx`, replace its hand-built overlay with `Dialog` + `DialogContent` + `DialogHeader` + `DialogTitle` + `DialogDescription` + `DialogFooter`, and keep every consent string and both action buttons exactly as they read today. Its props signature does not change.

- [ ] **Step 3: Confirm the webcam localStorage calls are untouched**

```bash
grep -c "pulse-cv-active\|pulse-cv-consent" app/components/Header.tsx
```

Expected: **9** — the same count as before this task. These are Defect 3; they are copied across verbatim and not reconciled with `webcam_cv_global_disabled`. If the count changed, restore the missing calls.

- [ ] **Step 4: Confirm the video surface is untouched**

```bash
grep -n "createPortal\|fullscreen\|bubble" app/components/Header.tsx | head
```

Expected: `createPortal` still present and the `normal` / `fullscreen` / `bubble` modes intact. A positioned video surface has no shadcn analogue; it is not migrated.

- [ ] **Step 5: Full gate**

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build
```

Expected: all four clean.

- [ ] **Step 6: Playwright**

```bash
npm run test:e2e
```

Expected: **3 passed.**

- [ ] **Step 7: Manual pass, including mobile**

Run `npm run dev`. Check high contrast, dyslexic font, and each font-scale step. Then resize to a mobile viewport (or use the Browser pane's `resize_window` mobile preset) and confirm both the notifications and accessibility panels open as bottom sheets and close on Escape and on backdrop click.

- [ ] **Step 8: Commit**

```bash
git add app/components/Header.tsx app/components/WebcamCVConsentModal.tsx
git commit -m "Migrate Header profile menu to shadcn DropdownMenu and consent modal to Dialog"
```

---

## Task 8: `Sidebar` — extract `SidebarNav`, move the drawer to `Sheet`

**Files:**
- Create: `app/components/SidebarNav.tsx`, `app/components/Sidebar.test.tsx`
- Modify: `app/components/Sidebar.tsx`

**Interfaces:**
- Consumes: `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`; `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`; `Button`; `TabType` from `./Sidebar`.
- Produces:

```tsx
interface SidebarNavProps {
  menuItems: Array<{
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    desc: string;
    roles: string[];
  }>;
  activeTab: TabType;
  isCollapsed: boolean;
  onNavigate: () => void;
}
export default function SidebarNav(props: SidebarNavProps): React.ReactElement;
```

`TabType` stays exported from `Sidebar.tsx` — `AppShell.tsx` imports it from there.

- [ ] **Step 1: Write the characterization test**

Create `app/components/Sidebar.test.tsx`, testing `Sidebar` (the parent) so it runs pre-extraction.

```tsx
import type { ReactElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from './Sidebar';
import { AccessibilityProvider } from '../context/AccessibilityContext';

function renderSidebar(overrides: Record<string, unknown> = {}) {
  const props = {
    activeTab: 'dashboard' as const,
    setActiveTab: vi.fn(),
    isOpen: false,
    setIsOpen: vi.fn(),
    currentUser: { role: 'employee' },
    onLogout: vi.fn(),
    isCollapsed: false,
    setIsCollapsed: vi.fn(),
    ...overrides,
  };
  return render(
    <AccessibilityProvider>
      <Sidebar {...(props as never)} />
    </AccessibilityProvider>
  );
}

describe('Sidebar role filtering', () => {
  it('shows employee items and hides admin-only items', () => {
    renderSidebar({ currentUser: { role: 'employee' } });

    expect(screen.getByText('Personal Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Kudos Feed')).toBeInTheDocument();
    expect(screen.queryByText('Admin Control')).not.toBeInTheDocument();
    expect(screen.queryByText('User Management')).not.toBeInTheDocument();
  });

  it('shows admin items and hides employee-only items', () => {
    renderSidebar({ currentUser: { role: 'admin' } });

    expect(screen.getByText('Admin Control')).toBeInTheDocument();
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.queryByText('Kudos Feed')).not.toBeInTheDocument();
  });

  it('shows the manager view only to managers', () => {
    renderSidebar({ currentUser: { role: 'manager' } });

    expect(screen.getByText('Manager View')).toBeInTheDocument();
  });

  it('closes the drawer when the backdrop is dismissed', async () => {
    const user = userEvent.setup();
    const setIsOpen = vi.fn();
    renderSidebar({ isOpen: true, setIsOpen });

    await user.keyboard('{Escape}');

    expect(setIsOpen).toHaveBeenCalledWith(false);
  });
});
```

- [ ] **Step 2: Run it pre-refactor**

```bash
npx vitest run app/components/Sidebar.test.tsx
```

Expected: **first three PASS, the fourth FAILS.** That failure is the point of this task: the current drawer is a CSS transform with no Escape handling. Comment the fourth test out with a note, get the first three green, then re-enable it in Step 5.

- [ ] **Step 3: Create `SidebarNav.tsx`**

Move the `<nav>` block and its `menuItems.map(...)` body across. Each row becomes a `Button` wrapping the `Link` via `asChild`, matching the `/inbox` contact-row precedent from 7a, and the collapsed-state native `title` becomes a real `Tooltip`:

```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from './ui/button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/tooltip';
import type { TabType } from './Sidebar';

interface SidebarNavProps {
  menuItems: Array<{
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    desc: string;
    roles: string[];
  }>;
  activeTab: TabType;
  isCollapsed: boolean;
  onNavigate: () => void;
}

const HREF_BY_TAB: Record<TabType, string> = {
  dashboard: '/', inbox: '/inbox', kudos: '/kudos', support: '/support',
  privacy: '/privacy', coffee: '/coffee', manager: '/manager',
  admin: '/admin', settings: '/settings', users: '/users',
};

export default function SidebarNav({ menuItems, activeTab, isCollapsed, onNavigate }: SidebarNavProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const row = (
            <Button
              asChild
              variant={activeTab === item.id ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-3 h-auto py-2.5"
              onClick={onNavigate}
            >
              <Link href={HREF_BY_TAB[item.id]}>
                <Icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            </Button>
          );

          return isCollapsed ? (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>{row}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ) : (
            <React.Fragment key={item.id}>{row}</React.Fragment>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}
```

Before writing `HREF_BY_TAB`, read the existing `Link href` values in `Sidebar.tsx` and copy them exactly — do not assume the mapping above matches. Correct it if it differs.

- [ ] **Step 4: Render `SidebarNav` in both places**

In `Sidebar.tsx`: keep the existing `<aside>` for `lg` and up, and render `<SidebarNav ... onNavigate={() => {}} />` inside it. Below `lg`, render a `Sheet` bound to `isOpen` / `setIsOpen`:

```tsx
<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <SheetContent side="left" className="w-72 p-0 lg:hidden">
    <SheetHeader className="p-4 border-b">
      <SheetTitle className="sr-only">Navigation</SheetTitle>
    </SheetHeader>
    <SidebarNav
      menuItems={menuItems}
      activeTab={activeTab}
      isCollapsed={false}
      onNavigate={() => setIsOpen(false)}
    />
  </SheetContent>
</Sheet>
```

Add `lg:flex hidden` to the static `<aside>` so the two never both show. The hamburger trigger keeps its existing `aria-expanded` and `aria-label="Toggle sidebar menu"`. Delete the hand-built mobile backdrop div and the `z-[55]` / `z-[60]` / `z-[65]` classes.

- [ ] **Step 5: Re-enable the Escape test and verify**

Un-comment the fourth test.

```bash
npx vitest run app/components/Sidebar.test.tsx
```

Expected: **PASS, 4 tests** — including the Escape case that failed in Step 2. `Sheet` supplies the focus trap and Escape handling the CSS drawer lacked.

- [ ] **Step 6: Full gate**

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build
```

Expected: all four clean.

- [ ] **Step 7: Manual pass**

`npm run dev`, mobile viewport: open the drawer, Tab through it and confirm focus stays inside, press Escape and confirm it closes. Desktop: collapse the sidebar and confirm tooltips appear on hover **and** on keyboard focus.

- [ ] **Step 8: Commit**

```bash
git add app/components/SidebarNav.tsx app/components/Sidebar.test.tsx app/components/Sidebar.tsx
git commit -m "Extract SidebarNav and move the mobile drawer onto shadcn Sheet

The CSS-transform drawer had no focus trap and no Escape-to-close; tabbing
out of an open drawer walked into the page behind it. Sheet supplies both.
Collapsed-state native title attributes become real Tooltips."
```

---

## Task 9: `app/page.tsx` dashboard layout

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `Card`, `CardContent` from `./components/ui/card`; `Button` from `./components/ui/button`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Convert the welcome banner to `Card`**

Replace the outer `<div className="p-4 sm:p-6 glass-card rounded-2xl border ...">` with:

```tsx
<Card className="bg-transparent border-transparent shadow-none glass-card rounded-2xl p-4 sm:p-6 flex flex-col gap-6">
```

That className combination is the 7a Card-layering pattern. Drop the `highContrast ? 'border-black' : 'border-border-color'` conditional — the token-driven `--border` resolves it.

- [ ] **Step 2: Convert the two action buttons**

The EAP link is an anchor and must stay one, so use `asChild` to keep `target` and `rel`:

```tsx
{eapUrl && (
  <Button asChild variant="secondary" className="flex-1 md:flex-none px-5 py-2.5 h-auto rounded-xl font-bold text-sm">
    <a href={eapUrl} target="_blank" rel="noopener noreferrer">
      <Heart className="w-4 h-4 text-rose-500" /> EAP Support
    </a>
  </Button>
)}
<Button
  onClick={() => setIsWindDownOpen(true)}
  className="flex-1 md:flex-none px-5 py-2.5 h-auto rounded-xl font-medium text-sm bg-neutral-800 hover:bg-black"
>
  <Moon className="w-4 h-4 text-teal-400" /> Wind-Down
</Button>
```

`rel="noopener noreferrer"` must survive — dropping it on a `target="_blank"` link is a security regression.

- [ ] **Step 3: Collapse the three copy-pasted stat tiles into one repeated row**

```tsx
const stats = [
  { icon: Inbox, label: 'Queued Mail', value: `${outboxCount} locked` },
  { icon: ThumbsUp, label: 'Kudos Shared', value: `${kudosCount} notes` },
  { icon: Heart, label: 'Sentiment Checks', value: `${sentimentCount} logs` },
];
```

```tsx
<div className="flex flex-wrap gap-3">
  {stats.map(({ icon: Icon, label, value }) => (
    <Card key={label} className="bg-neutral-50/50 border-neutral-100 shadow-none rounded-xl px-3.5 py-2.5 flex-1 sm:flex-none">
      <CardContent className="p-0 flex items-center gap-2 text-xs">
        <Icon className="h-4.5 w-4.5 text-teal-600 shrink-0" />
        <div className="whitespace-nowrap">
          <span className="block text-[10px] text-neutral-400 font-semibold uppercase">{label}</span>
          <span className="font-bold text-neutral-700">{value}</span>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

All six strings are preserved verbatim.

- [ ] **Step 4: Confirm the 7c boundary held**

```bash
git status --short
```

Expected: **only `app/page.tsx` modified.** If any file from the Global Constraints 7c list appears, revert it — the `focus-dimming-card glass-card` wrapper divs are the boundary and their contents are not this phase's work.

- [ ] **Step 5: Verify**

```bash
npm run lint && npx tsc --noEmit && npm test
```

Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "Migrate the dashboard banner and stat tiles onto shadcn Card and Button"
```

---

## Task 10: `UserManagement`

**Files:**
- Modify: `app/components/UserManagement.tsx`

**Interfaces:**
- Consumes: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`; `Badge`; `Input`; `Select`; `Button`; `Card`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Convert the table**

The existing markup at lines ~220–275 is a real `<table>`. Map it one-for-one: `<table>` to `Table`, `<thead>` to `TableHeader`, `<tbody>` to `TableBody`, `<tr>` to `TableRow`, `<th>` to `TableHead`, `<td>` to `TableCell`. The four column headers stay verbatim: `Employee`, `Role`, `Status`, `Actions`. Keep the `colSpan={4}` empty-state row and its exact copy, `No users found matching "<query>"`.

- [ ] **Step 2: Convert role and status pills to `Badge`**

Replace the ad-hoc styled spans. Preserve the existing colour semantics by choosing the matching `Badge` variant, or by passing the current colour classes through `className` where no variant matches. Do not change any pill's text.

- [ ] **Step 3: Convert search, role select, and action buttons**

Search `<input>` to `Input` (keep its placeholder verbatim); the two `<select>` elements to `Select` (keep every option value and label); the three `<button>` elements to `Button`. The status-toggle action calls `handleToggleStatus(u.id, u.status || 'active', u.email)` — keep that call site and its arguments exactly.

- [ ] **Step 4: Convert panels to `Card`**

Apply the layering pattern from Task 9 Step 1 to the page's `glass-card` panels.

- [ ] **Step 5: Verify**

```bash
npm run lint && npx tsc --noEmit && npm test
```

Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add app/components/UserManagement.tsx
git commit -m "Migrate UserManagement onto shadcn Table, Badge, Input, Select, and Button"
```

---

## Task 11: `AdminConsole`

**Files:**
- Modify: `app/components/AdminConsole.tsx`

**Interfaces:**
- Consumes: `Switch`, `Select`, `Input`, `Label`, `Button`, `Card`, `Alert`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Convert the two real switches**

Exactly two controls carry `role="switch"` today — org-wide webcam CV (`handleToggleCVGlobal`) and SCIM sync. Both become `Switch`, which supplies switch semantics natively, so the hand-written `role="switch"` and `aria-checked` attributes are deleted rather than carried over. Keep both `aria-label` strings: `Toggle org-wide webcam CV` and `Toggle SCIM sync`.

```tsx
<Switch
  checked={!cvGlobalDisabled}
  onCheckedChange={handleToggleCVGlobal}
  aria-label="Toggle org-wide webcam CV"
/>
```

Note the inversion: the existing markup renders `aria-checked={!cvGlobalDisabled}`, so `checked` must be `!cvGlobalDisabled`, not `cvGlobalDisabled`. Getting this backwards silently inverts an org-wide privacy control.

- [ ] **Step 2: The emergency kill switch is NOT a `Switch`**

It is a full-width action button whose label flips between `PAUSE PULSE SYSTEM` and `RESUME PULSE PORTAL`. It becomes a `Button`, keeping both strings and the conditional colouring:

```tsx
<Button
  onClick={handleToggleSystemPaused}
  variant={config.emergency_kill_switch ? 'default' : 'destructive'}
  className={`w-full py-3 h-auto rounded-xl text-xs font-extrabold gap-2 mt-6 ${
    config.emergency_kill_switch ? 'bg-green-600 hover:bg-green-700 text-white' : ''
  }`}
>
  <ShieldAlert className="h-4.5 w-4.5" />
  <span>{config.emergency_kill_switch ? 'RESUME PULSE PORTAL' : 'PAUSE PULSE SYSTEM'}</span>
</Button>
```

- [ ] **Step 3: Convert the four selects and the config inputs**

All four `<select>` elements become `Select`, preserving every option value and label — including the SSO provider values `none` / `okta` / `entra_id` and the data-residency values `US` / `EU` / `APAC`, which are persisted to the database and must not change. Config fields become `Input` + `Label` with matching `htmlFor` and `id`.

- [ ] **Step 4: Replace the three `alert()` calls with inline error state**

The component already has an `error` state and a `showSaveToast` mechanism. Replace each `alert('Failed to ...')` with a `setError(...)` call rendered through `Alert variant="destructive"`, matching `ProfileSetupDialog`. **Do not add a toast library** — restyle the existing `showSaveToast` / `secSaveToast` in place.

- [ ] **Step 5: Convert panels to `Card`**

Apply the layering pattern from Task 9 Step 1.

- [ ] **Step 6: Verify**

```bash
npm run lint && npx tsc --noEmit && npm test
```

Expected: all clean.

- [ ] **Step 7: Manual verification of the inverted toggle**

`npm run dev`, sign in as an admin, open `/admin`. Confirm the webcam CV switch's **on** position corresponds to "Employees may individually opt in to webcam CV" and **off** to "Computer vision disabled for all employees" — i.e. identical to before the change. This is the one place in Phase 7b where a mistake silently flips a privacy control.

- [ ] **Step 8: Commit**

```bash
git add app/components/AdminConsole.tsx
git commit -m "Migrate AdminConsole onto shadcn Switch, Select, Input, Button, and Card

The emergency kill switch stays a Button, not a Switch -- it is a
full-width action control whose label flips between two states, not a
binary toggle. Replaces three bare alert() calls with inline Alert state."
```

---

## Task 12: `ManagerDashboard` and final gate

**Files:**
- Create: `app/components/ManagerDashboard.test.tsx`
- Modify: `app/components/ManagerDashboard.tsx`

**Interfaces:**
- Consumes: `Card`, `Table` family, `Input`, `Label`, `Button`.
- Produces: nothing.

**This task carries the spec's preservation rule.** The "Simulate Submissions" toggle, the `responseCount < kanonFloor` condition, the `blur-md` overlay, its `role="alert"`, and the hardcoded seven-element chart array all survive with unchanged behavior. Deleting the control would remove the only visible evidence that `/manager` has no real aggregate query behind it, converting a documented Phase 8 gap into a silent one.

- [ ] **Step 1: Write the k-anonymity characterization test**

Create `app/components/ManagerDashboard.test.tsx`.

```tsx
import type { ReactElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManagerDashboard from './ManagerDashboard';
import { AccessibilityProvider } from '../context/AccessibilityContext';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'mgr-1' } } }) },
    from: vi.fn((table: string) => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        single: vi.fn().mockResolvedValue({
          data: table === 'admin_configs' ? { privacy_floor: 5 } : null,
          error: null,
        }),
      };
      return chain;
    }),
  },
}));

function renderDashboard(ui: ReactElement) {
  return render(<AccessibilityProvider>{ui}</AccessibilityProvider>);
}

describe('ManagerDashboard k-anonymity gate', () => {
  it('shows the privacy overlay while the cohort is below the floor', async () => {
    renderDashboard(<ManagerDashboard />);

    const overlay = await screen.findByRole('alert');
    expect(overlay).toHaveTextContent(/insufficient data to protect team privacy/i);
  });

  it('clears the overlay when the simulated cohort reaches the floor', async () => {
    const user = userEvent.setup();
    renderDashboard(<ManagerDashboard />);

    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: /^large/i }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the simulate-submissions control visible', async () => {
    renderDashboard(<ManagerDashboard />);

    expect(await screen.findByText(/simulate submissions/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^small/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^large/i })).toBeInTheDocument();
  });
});
```

The third test is the guardrail: it fails loudly if a future refactor tidies the control away.

- [ ] **Step 2: Run it pre-refactor**

```bash
npx vitest run app/components/ManagerDashboard.test.tsx
```

Expected: **PASS, 3 tests.** If any fails, the test is wrong — fix it until green *before* touching the component.

- [ ] **Step 3: Add the Phase 8 comment**

Above the `responseCount` declaration in `ManagerDashboard.tsx`:

```tsx
  // DEMO SCAFFOLDING, NOT ENFORCEMENT. responseCount is never fetched -- it is
  // driven only by the on-screen "Simulate Submissions" toggle, and the chart it
  // gates is a hardcoded array blurred with CSS on data already sent to the
  // client. Phase 8, task 1 replaces this with a real aggregate query carrying a
  // database-level minimum-count guard. Do not delete this control before then:
  // it is the only visible evidence that /manager has no real aggregate behind it.
  // See docs/superpowers/specs/2026-08-30-shadcn-shell-dashboards-design.md, Defect 2.
  const [responseCount, setResponseCount] = useState(3);
```

- [ ] **Step 4: Migrate the markup**

Panels become `Card` using the Task 9 Step 1 layering pattern. The provisioning form's four `<input>` elements become `Input` + `Label` with matching `htmlFor`/`id`. The roster table becomes `Table`. The two Simulate Submissions `<button>` elements become `Button variant="ghost"`, keeping their `Small (n)` and `Large (n)` label expressions intact. The blur overlay stays a plain positioned `<div>` with its `role="alert"` — do not convert it to `Alert`, which would change its layout from an absolute overlay to a flow element.

- [ ] **Step 5: Verify against the refactor**

```bash
npx vitest run app/components/ManagerDashboard.test.tsx
```

Expected: **PASS, 3 tests**, same file unedited.

- [ ] **Step 6: Confirm the defects survived**

```bash
grep -c "Simulate Submissions" app/components/ManagerDashboard.tsx
grep -n "blur-md" app/components/ManagerDashboard.tsx
grep -n "share_bri_with_manager" app/components/ManagerDashboard.tsx
```

Expected: the label present, the `blur-md` gate present, and the `share_bri_with_manager` query unchanged. That last query still returns only the manager's own row under RLS (Defect 1) — that is expected and is not fixed here.

- [ ] **Step 7: Final full gate**

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build && npm run test:e2e
```

Expected: lint silent, tsc silent, all Vitest files pass, build succeeds for all 13 routes, Playwright 3 passed.

- [ ] **Step 8: Confirm no 7c file was opened across the whole phase**

```bash
git diff --name-only 45089cc..HEAD
```

Expected: no file from the Global Constraints 7c list appears anywhere in the phase's diff.

- [ ] **Step 9: Manual pass**

`npm run dev`, sign in as a manager, open `/manager`. Confirm the overlay is present by default, that clicking `Large` clears it and `Small` restores it, and that high contrast, dyslexic font, and each font-scale step all render correctly.

- [ ] **Step 10: Commit**

```bash
git add app/components/ManagerDashboard.tsx app/components/ManagerDashboard.test.tsx
git commit -m "Migrate ManagerDashboard onto shadcn Card, Table, Input, and Button

Preserves the Simulate Submissions control, the responseCount < kanonFloor
gate, and the blurred hardcoded chart exactly as they were, with a comment
pointing at the Phase 8 task that replaces them. A test now asserts the
control is still present, so a later refactor cannot quietly remove the
only visible evidence that /manager has no real aggregate query."
```

---

## Definition of done

- All 8 in-scope files render via shadcn primitives; no hand-built dropdown, drawer, or modal overlay remains in the shell.
- `e2e/auth-gate.spec.ts` passes unmodified.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` all clean.
- Five new Vitest files exist — `LoginGate`, `ProfileSetupDialog`, `Sidebar`, `Header`, `ManagerDashboard` — each verified against both pre- and post-refactor code.
- The three known defects are unchanged in behavior, and Defect 2 carries its in-code Phase 8 comment.
- No Phase 7c file appears in the phase diff.
