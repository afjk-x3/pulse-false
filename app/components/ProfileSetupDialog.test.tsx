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
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
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
        order: vi.fn(() => chain),
        single: vi.fn().mockResolvedValue({
          data: table === 'user_profiles' ? PROFILE_WITHOUT_PHONE : { emergency_kill_switch: false },
          error: null,
        }),
      };
      return chain;
    }),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
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
