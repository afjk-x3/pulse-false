import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SupportCircles from './SupportCircles';
import { AccessibilityProvider } from '../context/AccessibilityContext';

const { messageInsertMock } = vi.hoisted(() => ({
  messageInsertMock: vi.fn().mockResolvedValue({ error: null }),
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
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    from: vi.fn((table: string) => {
      if (table === 'user_profiles') {
        // Two distinct query shapes hit this table:
        //   .select('id, full_name')                    -> resolves directly (fetchMessages)
        //   .select('full_name').eq('id', ...).single()  -> chained (handleSendMessage)
        const singleChain = {
          eq: vi.fn(() => singleChain),
          single: vi.fn().mockResolvedValue({ data: { full_name: 'Sam Employee' }, error: null }),
        };
        return {
          select: vi.fn((cols: string) => {
            if (cols === 'id, full_name') {
              return Promise.resolve({ data: [{ id: 'user-1', full_name: 'Sam Employee' }], error: null });
            }
            return singleChain;
          }),
        };
      }
      if (table === 'support_circle_messages') {
        const selectChain = {
          select: vi.fn(() => selectChain),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
        return {
          select: selectChain.select,
          insert: messageInsertMock,
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
  messageInsertMock.mockClear();
});

describe('SupportCircles', () => {
  it('renders the default active circle and its sidebar list', async () => {
    renderWithAccessibility(<SupportCircles />);

    expect(await screen.findByRole('heading', { name: /stress reduction channel/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /working moms of engineering/i })).toBeInTheDocument();
  });

  it('sends a message anonymously by default', async () => {
    const user = userEvent.setup();
    renderWithAccessibility(<SupportCircles />);

    await screen.findByRole('heading', { name: /stress reduction channel/i });
    await user.type(screen.getByPlaceholderText(/send message to/i), 'Feeling overwhelmed today');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(messageInsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          topic_channel: 'stress',
          message: 'Feeling overwhelmed today',
        })
      );
    });
    const payload = messageInsertMock.mock.calls[0][0];
    expect(payload.pseudonym_alias).not.toMatch(/^REALNAME:/);
  });

  it('sends a message with the real name when anonymous is toggled off', async () => {
    const user = userEvent.setup();
    renderWithAccessibility(<SupportCircles />);

    await screen.findByRole('heading', { name: /stress reduction channel/i });
    await user.click(screen.getByRole('switch'));
    await user.type(screen.getByPlaceholderText(/send message to/i), 'Sharing under my real name');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(messageInsertMock).toHaveBeenCalledWith(
        expect.objectContaining({ pseudonym_alias: 'REALNAME:Sam Employee' })
      );
    });
  });

  it('switching the active circle updates the chat header', async () => {
    const user = userEvent.setup();
    renderWithAccessibility(<SupportCircles />);

    await screen.findByRole('heading', { name: /stress reduction channel/i });
    await user.click(screen.getByRole('option', { name: /marathon trainers/i }));

    expect(await screen.findByRole('heading', { name: /marathon trainers channel/i })).toBeInTheDocument();
  });

  it('opens the discover modal, searches, and joining a circle adds it to the sidebar', async () => {
    const user = userEvent.setup();
    renderWithAccessibility(<SupportCircles />);

    await screen.findByRole('heading', { name: /stress reduction channel/i });
    await user.click(screen.getByRole('button', { name: /discover more circles/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/search support circles/i), 'Sleep');

    await user.click(screen.getByRole('button', { name: /join circle/i }));

    // Note: joining does not close the Discover modal (no such call in
    // handleJoinCircle) -- that's existing behavior, not a regression. The
    // background is correctly aria-hidden while the dialog stays open, so
    // close it (as a real user would) before checking background content.
    expect(await screen.findByText(/no support circles match your search query/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^done$/i }));

    expect(await screen.findByRole('heading', { name: /sleep & recovery channel/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /sleep & recovery/i })).toBeInTheDocument();
  });

  it('opens the create circle modal and creates a new circle', async () => {
    const user = userEvent.setup();
    renderWithAccessibility(<SupportCircles />);

    await screen.findByRole('heading', { name: /stress reduction channel/i });
    await user.click(screen.getByRole('button', { name: /create new circle/i }));

    expect(await screen.findByRole('heading', { name: /create employee circle/i })).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/e\.g\. remote developers/i), 'Book Club');
    await user.click(screen.getByRole('button', { name: /^create circle$/i }));

    expect(await screen.findByRole('heading', { name: /book club channel/i })).toBeInTheDocument();
  });
});
