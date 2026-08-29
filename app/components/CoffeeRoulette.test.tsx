import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CoffeeRoulette from './CoffeeRoulette';
import { AccessibilityProvider } from '../context/AccessibilityContext';

const { pairingsLimitMock, profileSingleMock } = vi.hoisted(() => ({
  pairingsLimitMock: vi.fn(),
  profileSingleMock: vi.fn(),
}));

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
    from: vi.fn((table: string) => {
      if (table === 'coffee_roulette_pairings') {
        const chain = {
          select: vi.fn(() => chain),
          or: vi.fn(() => chain),
          order: vi.fn(() => chain),
          limit: pairingsLimitMock,
        };
        return chain;
      }
      if (table === 'user_profiles') {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          single: profileSingleMock,
        };
        return chain;
      }
      throw new Error(`Unexpected table in test: ${table}`);
    }),
  },
}));

function renderWithAccessibility(ui: ReactElement) {
  return render(<AccessibilityProvider>{ui}</AccessibilityProvider>);
}

function mockPaired() {
  pairingsLimitMock.mockResolvedValue({
    data: [{ user_1_id: 'user-1', user_2_id: 'partner-1', created_at: '2026-01-01T00:00:00Z' }],
    error: null,
  });
  profileSingleMock.mockResolvedValue({
    data: { full_name: 'James Miller', job_title: 'Staff Engineer', avatar: 'JM' },
    error: null,
  });
}

function mockUnpaired() {
  pairingsLimitMock.mockResolvedValue({ data: [], error: null });
}

beforeEach(() => {
  pairingsLimitMock.mockReset();
  profileSingleMock.mockReset();
  window.localStorage.clear();
});

describe('CoffeeRoulette', () => {
  it('shows the paired colleague once the fetch resolves', async () => {
    mockPaired();
    renderWithAccessibility(<CoffeeRoulette />);

    expect(await screen.findByText('James Miller')).toBeInTheDocument();
    expect(screen.getByText('Staff Engineer')).toBeInTheDocument();
  });

  it('shows the empty state with a Simulate Match button when no pairing exists', async () => {
    mockUnpaired();
    renderWithAccessibility(<CoffeeRoulette />);

    expect(await screen.findByText(/no active pairing found/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /simulate match/i })).toBeInTheDocument();
  });

  it('toggling the switch off pauses pairing and persists to localStorage', async () => {
    mockPaired();
    const user = userEvent.setup();
    renderWithAccessibility(<CoffeeRoulette />);

    await screen.findByText('James Miller');
    await user.click(screen.getByRole('switch'));

    expect(await screen.findByText(/coffee roulette is paused/i)).toBeInTheDocument();
    expect(window.localStorage.getItem('pulse-coffee-roulette-paused')).toBe('true');
  });

  it('sending a chat message adds it to the message list', async () => {
    mockPaired();
    const user = userEvent.setup();
    renderWithAccessibility(<CoffeeRoulette />);

    await screen.findByText('James Miller');
    const chatInput = screen.getByPlaceholderText(/type a message/i);
    await user.type(chatInput, 'Hey, how is it going?{Enter}');

    expect(await screen.findByText('Hey, how is it going?')).toBeInTheDocument();
  });

  it('clicking an icebreaker starter sends it as a message', async () => {
    mockPaired();
    const user = userEvent.setup();
    renderWithAccessibility(<CoffeeRoulette />);

    await screen.findByText('James Miller');
    const starter = screen.getByRole('button', { name: /how are you managing off-hours/i });
    await user.click(starter);

    await waitFor(() => {
      expect(screen.getAllByText(/how are you managing off-hours/i).length).toBeGreaterThan(0);
    });
  });
});
