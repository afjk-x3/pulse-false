import type { ReactElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from './Header';
import { AccessibilityProvider } from '../context/AccessibilityContext';

// jsdom has no layout engine, so Tailwind's `hidden sm:block` / `sm:hidden`
// wrappers can't hide either notifications trigger the way a real browser
// would -- Header.tsx gates which of Popover/Sheet is actually `open` on a
// `window.matchMedia` check (both are always mounted, but only one is ever
// the "live" controlled root, matching the shadcn responsive dialog/drawer
// pattern) so only one is ever interactive at a time. `vitest.setup.ts`
// stubs `window.matchMedia` to report matches: true (a desktop viewport),
// which is why the test below clicks the first (desktop) trigger.

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn(() => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn(() => chain),
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

    await user.click(screen.getAllByRole('button', { name: /notifications/i })[0]);

    expect(await screen.findByText(/no notifications/i)).toBeInTheDocument();
  });

  it('accessibility controls still write through to the context', async () => {
    const user = userEvent.setup();
    renderHeader(<Header title="Guardian Dashboard" currentUser={CURRENT_USER} onLogout={vi.fn()} />);

    // The accessibility hub is reached through the profile dropdown (it is
    // NOT a top-level header trigger) both before and after the shadcn
    // migration. The high-contrast control is already role="switch" in the
    // hand-built markup, so this same query works pre- and post-refactor.
    // getAllByRole rather than getByRole: post-migration the hub trigger is
    // duplicated (desktop Popover + mobile Sheet), and jsdom's lack of a
    // layout engine means both are present in the accessibility tree even
    // though Tailwind's `hidden sm:block` / `sm:hidden` would only show one
    // in a real browser -- see the notifications test above for the same
    // pattern.
    await user.click(screen.getByRole('button', { name: /toggle profile menu/i }));
    await user.click(screen.getAllByRole('button', { name: /accessibility hub/i })[0]);
    await user.click(await screen.findByRole('switch', { name: /high contrast/i }));

    expect(document.body).toHaveClass('high-contrast');
  });
});
