import type { ReactElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PrivacyCenter from './PrivacyCenter';
import { AccessibilityProvider } from '../context/AccessibilityContext';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    from: vi.fn((table: string) => {
      if (table === 'admin_configs') {
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { webcam_cv_global_disabled: false },
              error: null,
            }),
          }),
        };
      }
      if (table === 'user_profiles') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      throw new Error(`Unexpected table in test: ${table}`);
    }),
  },
}));

function renderWithAccessibility(ui: ReactElement) {
  return render(<AccessibilityProvider>{ui}</AccessibilityProvider>);
}

describe('PrivacyCenter', () => {
  it('renders the export and delete actions', async () => {
    renderWithAccessibility(<PrivacyCenter />);

    expect(await screen.findByRole('button', { name: /download my data/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete my profile/i })).toBeInTheDocument();
  });

  it('opens the deletion confirmation dialog when "Delete My Profile" is clicked', async () => {
    const user = userEvent.setup();
    renderWithAccessibility(<PrivacyCenter />);

    await user.click(screen.getByRole('button', { name: /delete my profile/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/confirm profile deletion/i)).toBeInTheDocument();
  });

  it('closes the dialog on Cancel without deleting anything', async () => {
    const user = userEvent.setup();
    renderWithAccessibility(<PrivacyCenter />);

    await user.click(screen.getByRole('button', { name: /delete my profile/i }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('shows a success state after confirming deletion', async () => {
    const user = userEvent.setup();
    renderWithAccessibility(<PrivacyCenter />);

    await user.click(screen.getByRole('button', { name: /delete my profile/i }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /delete all data/i }));

    expect(await screen.findByText(/deletion request submitted/i)).toBeInTheDocument();
  });
});
