import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KudosFeed from './KudosFeed';
import { AccessibilityProvider } from '../context/AccessibilityContext';

const { kudosInsertMock, likeUpdateMock } = vi.hoisted(() => ({
  kudosInsertMock: vi.fn().mockResolvedValue({ error: null }),
  likeUpdateMock: vi.fn().mockResolvedValue({ error: null }),
}));

const PROFILES = [
  { id: 'user-1', full_name: 'Sam Employee', role: 'user' },
  { id: 'contact-1', full_name: 'James Miller', role: 'user' },
  { id: 'contact-2', full_name: 'Priya Shah', role: 'user' },
];

const KUDOS_POSTS = [
  {
    id: 'kudos-1',
    sender_id: 'contact-1',
    recipient_id: 'user-1',
    message: 'ANON:James|Great work on the launch!',
    category: 'Gratitude',
    likes_count: 2,
    created_at: '2026-08-25T00:00:00Z',
  },
  {
    id: 'kudos-2',
    sender_id: 'contact-2',
    recipient_id: 'contact-1',
    message: 'ANON:|Loved pairing with you this week.',
    category: 'Collaboration',
    likes_count: 0,
    created_at: '2026-08-24T00:00:00Z',
  },
];

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    from: vi.fn((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: vi.fn().mockResolvedValue({ data: PROFILES, error: null }),
        };
      }
      if (table === 'kudos_posts') {
        const selectChain = {
          select: vi.fn(() => selectChain),
          order: vi.fn().mockResolvedValue({ data: KUDOS_POSTS, error: null }),
        };
        return {
          select: selectChain.select,
          insert: kudosInsertMock,
          update: vi.fn(() => ({ eq: likeUpdateMock })),
        };
      }
      throw new Error(`Unexpected table in test: ${table}`);
    }),
  },
}));

function renderWithAccessibility(ui: ReactElement) {
  return render(<AccessibilityProvider>{ui}</AccessibilityProvider>);
}

beforeEach(() => {
  kudosInsertMock.mockClear();
  likeUpdateMock.mockClear();
});

describe('KudosFeed', () => {
  it('renders kudos posts from the feed', async () => {
    renderWithAccessibility(<KudosFeed />);

    expect(await screen.findByText(/great work on the launch/i)).toBeInTheDocument();
    expect(screen.getByText(/loved pairing with you this week/i)).toBeInTheDocument();
  });

  it('search filters the feed by message content', async () => {
    const user = userEvent.setup();
    renderWithAccessibility(<KudosFeed />);

    await screen.findByText(/great work on the launch/i);
    await user.type(screen.getByPlaceholderText(/search by name, sender, or keyword/i), 'pairing');

    expect(screen.queryByText(/great work on the launch/i)).not.toBeInTheDocument();
    expect(screen.getByText(/loved pairing with you this week/i)).toBeInTheDocument();
  });

  it('category filter pills filter the feed', async () => {
    const user = userEvent.setup();
    renderWithAccessibility(<KudosFeed />);

    await screen.findByText(/great work on the launch/i);
    await user.click(screen.getByRole('button', { name: 'Collaboration' }));

    expect(screen.queryByText(/great work on the launch/i)).not.toBeInTheDocument();
    expect(screen.getByText(/loved pairing with you this week/i)).toBeInTheDocument();
  });

  it('liking a post increments the like count and disables further likes', async () => {
    const user = userEvent.setup();
    renderWithAccessibility(<KudosFeed />);

    await screen.findByText(/great work on the launch/i);
    const likeButton = screen.getByRole('button', { name: /like this kudos\. current likes: 2/i });
    await user.click(likeButton);

    expect(await screen.findByText('3 Likes')).toBeInTheDocument();
    expect(likeUpdateMock).toHaveBeenCalledWith('id', 'kudos-1');

    await user.click(screen.getByRole('button', { name: /like this kudos\. current likes: 3/i }));
    expect(likeUpdateMock).toHaveBeenCalledTimes(1); // second click on an already-liked post is a no-op
  });

  it('opens the composer when Send Kudos Note is clicked', async () => {
    const user = userEvent.setup();
    renderWithAccessibility(<KudosFeed />);

    await screen.findByText(/great work on the launch/i);
    await user.click(screen.getByRole('button', { name: /send kudos note/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/compose kudos recognition/i)).toBeInTheDocument();
  });

  it('selecting a recipient via the combobox and submitting sends the expected payload', async () => {
    const user = userEvent.setup();
    renderWithAccessibility(<KudosFeed />);

    await screen.findByText(/great work on the launch/i);
    await user.click(screen.getByRole('button', { name: /send kudos note/i }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('combobox', { name: /recipient name/i }));
    await user.click(await screen.findByText('Priya Shah'));

    await user.type(screen.getByLabelText(/appreciation message/i), 'Thanks for the great feedback!');
    await user.click(screen.getByRole('button', { name: /^send kudos$/i }));

    await waitFor(() => {
      expect(kudosInsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sender_id: 'user-1',
          recipient_id: 'contact-2',
          message: 'ANON:|Thanks for the great feedback!',
          category: 'Gratitude',
        })
      );
    });
  });

  it('shows a composer error and does not submit when no recipient is selected', async () => {
    const user = userEvent.setup();
    renderWithAccessibility(<KudosFeed />);

    await screen.findByText(/great work on the launch/i);
    await user.click(screen.getByRole('button', { name: /send kudos note/i }));
    await screen.findByRole('dialog');

    await user.type(screen.getByLabelText(/appreciation message/i), 'Great job this week!');
    await user.click(screen.getByRole('button', { name: /^send kudos$/i }));

    expect(await screen.findByText(/please select a valid colleague/i)).toBeInTheDocument();
    expect(kudosInsertMock).not.toHaveBeenCalled();
  });
});
