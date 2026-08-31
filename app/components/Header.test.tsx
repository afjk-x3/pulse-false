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
});
