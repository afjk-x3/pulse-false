import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InboxPage from './page';
import { AuthContext } from '../components/AppShell';
import { AccessibilityProvider } from '../context/AccessibilityContext';

const { directMessageInsertMock, outboxInsertMock, notificationsInsertMock } = vi.hoisted(() => ({
  directMessageInsertMock: vi.fn(),
  outboxInsertMock: vi.fn().mockResolvedValue({ error: null }),
  notificationsInsertMock: vi.fn().mockResolvedValue({ error: null }),
}));

const CONTACTS = [
  {
    id: 'contact-1',
    full_name: 'James Miller',
    avatar: null,
    profile_image: null,
    job_title: 'Staff Engineer',
    working_hours_start: '09:00',
    working_hours_end: '17:00',
    timezone: 'UTC',
  },
  {
    id: 'contact-2',
    full_name: 'Priya Shah',
    avatar: null,
    profile_image: null,
    job_title: 'Product Manager',
    working_hours_start: '09:00',
    working_hours_end: '17:00',
    timezone: 'UTC',
  },
];

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
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
      if (table === 'user_profiles') {
        const chain = {
          select: vi.fn(() => chain),
          neq: vi.fn(() => chain),
          order: vi.fn().mockResolvedValue({ data: CONTACTS, error: null }),
        };
        return chain;
      }
      if (table === 'admin_configs') {
        const chain = {
          select: vi.fn(() => chain),
          single: vi.fn().mockResolvedValue({
            data: { standard_workday_start: '09:00', standard_workday_end: '17:00' },
            error: null,
          }),
        };
        return chain;
      }
      if (table === 'direct_messages') {
        const selectChain = {
          select: vi.fn(() => selectChain),
          or: vi.fn(() => selectChain),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
        const insertChain = {
          select: vi.fn(() => insertChain),
          single: directMessageInsertMock,
        };
        return {
          select: selectChain.select,
          insert: vi.fn(() => insertChain),
        };
      }
      if (table === 'outbox_messages') {
        return { insert: outboxInsertMock };
      }
      if (table === 'notifications') {
        return { insert: notificationsInsertMock };
      }
      throw new Error(`Unexpected table in test: ${table}`);
    }),
  },
}));

function renderInbox(currentUser: { id: string; full_name: string }) {
  return render(
    <AccessibilityProvider>
      <AuthContext.Provider value={{ currentUser, triggerRefresh: vi.fn(), session: {} }}>
        <InboxPage />
      </AuthContext.Provider>
    </AccessibilityProvider>
  );
}

function getSendButton(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector('form button[type="submit"]');
  if (!button) throw new Error('Send button not found');
  return button as HTMLButtonElement;
}

const CURRENT_USER = { id: 'user-1', full_name: 'Sam Employee' };

beforeEach(() => {
  directMessageInsertMock.mockReset();
  directMessageInsertMock.mockResolvedValue({
    data: { id: 'msg-1', sender_id: 'user-1', receiver_id: 'contact-1', content: 'Hey there', created_at: '2026-08-25T14:00:00Z' },
    error: null,
  });
  outboxInsertMock.mockClear();
  notificationsInsertMock.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('InboxPage', () => {
  it('renders the contact list', async () => {
    renderInbox(CURRENT_USER);

    expect(await screen.findByText('James Miller')).toBeInTheDocument();
    expect(screen.getByText('Priya Shah')).toBeInTheDocument();
  });

  it('search filters the contact list by name', async () => {
    const user = userEvent.setup();
    renderInbox(CURRENT_USER);

    await screen.findByText('James Miller');
    await user.type(screen.getByPlaceholderText(/search colleagues/i), 'Priya');

    expect(screen.getByText('Priya Shah')).toBeInTheDocument();
    expect(screen.queryByText('James Miller')).not.toBeInTheDocument();
  });

  it('selecting a contact shows the chat header with their name', async () => {
    const user = userEvent.setup();
    renderInbox(CURRENT_USER);

    await user.click(await screen.findByText('James Miller'));

    expect(await screen.findByRole('heading', { name: 'James Miller' })).toBeInTheDocument();
  });

  it('sending a message during business hours inserts a direct message and displays it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-08-25T14:00:00Z')); // Tuesday, 14:00 UTC — within 09:00-17:00
    const user = userEvent.setup();
    const { container } = renderInbox(CURRENT_USER);

    await user.click(await screen.findByText('James Miller'));
    await user.type(screen.getByPlaceholderText(/type a message/i), 'Hey there');
    await user.click(getSendButton(container));

    await waitFor(() => {
      expect(directMessageInsertMock).toHaveBeenCalled();
    });
    expect(outboxInsertMock).not.toHaveBeenCalled();
    expect(await screen.findByText('Hey there')).toBeInTheDocument();
  });

  it('sending a message outside business hours (weekend) queues it in the outbox instead', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-08-22T14:00:00Z')); // Saturday
    const user = userEvent.setup();
    const { container } = renderInbox(CURRENT_USER);

    await user.click(await screen.findByText('James Miller'));
    await user.type(screen.getByPlaceholderText(/type a message/i), 'Off hours message');
    await user.click(getSendButton(container));

    expect(await screen.findByText(/right-to-disconnect active/i)).toBeInTheDocument();
    expect(outboxInsertMock).toHaveBeenCalled();
    expect(directMessageInsertMock).not.toHaveBeenCalled();
  });
});
