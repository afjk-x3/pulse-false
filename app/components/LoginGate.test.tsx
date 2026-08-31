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
