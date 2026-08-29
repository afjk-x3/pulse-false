import type { ReactElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KAnonymityEmptyState from './KAnonymityEmptyState';
import { AccessibilityProvider } from '../context/AccessibilityContext';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

function renderWithAccessibility(ui: ReactElement) {
  return render(<AccessibilityProvider>{ui}</AccessibilityProvider>);
}

describe('KAnonymityEmptyState', () => {
  it('locks the aggregate chart behind a privacy veil below the k-anonymity threshold', () => {
    renderWithAccessibility(<KAnonymityEmptyState />);

    expect(
      screen.getByText(/insufficient data for this group to protect team privacy/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/3 \/ 5/)).toBeInTheDocument();
  });

  it('reveals the aggregate chart once the cohort meets the threshold', async () => {
    const user = userEvent.setup();
    renderWithAccessibility(<KAnonymityEmptyState />);

    await user.click(screen.getByRole('button', { name: /large \(7\)/i }));

    expect(
      screen.queryByText(/insufficient data for this group to protect team privacy/i)
    ).not.toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });

  it('re-locks the chart when the cohort drops back below the threshold', async () => {
    const user = userEvent.setup();
    renderWithAccessibility(<KAnonymityEmptyState />);

    await user.click(screen.getByRole('button', { name: /large \(7\)/i }));
    await user.click(screen.getByRole('button', { name: /small \(3\)/i }));

    expect(
      screen.getByText(/insufficient data for this group to protect team privacy/i)
    ).toBeInTheDocument();
  });
});
