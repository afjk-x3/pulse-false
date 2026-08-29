import type { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsView from './SettingsView';
import { AccessibilityProvider } from '../context/AccessibilityContext';
import type { Database } from '../lib/database.types';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

const { updateSpy, eqSpy } = vi.hoisted(() => ({
  updateSpy: vi.fn(),
  eqSpy: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === 'user_profiles') {
        updateSpy.mockReturnValue({ eq: eqSpy });
        return { update: updateSpy };
      }
      throw new Error(`Unexpected table in test: ${table}`);
    }),
  },
}));

const currentUser: UserProfile = {
  address: '123 Elm St, Springfield, IL',
  avatar: 'AR',
  camera_telemetry_consented: false,
  created_at: '2026-01-01T00:00:00Z',
  deletion_reason: null,
  deletion_scheduled_at: null,
  dyslexic_font_enabled: false,
  email: 'sam.employee@axionhr.com',
  full_name: 'Sam Employee',
  high_contrast_enabled: false,
  id: 'user-1',
  job_title: null,
  phone: '+1 (555) 019-2834',
  profile_image: null,
  reading_ruler_enabled: false,
  role: 'user',
  share_bri_with_manager: false,
  status: 'active',
  timezone: 'UTC',
  updated_at: '2026-01-01T00:00:00Z',
  working_hours_end: '17:00',
  working_hours_start: '09:00',
};

function renderWithAccessibility(ui: ReactElement) {
  return render(<AccessibilityProvider>{ui}</AccessibilityProvider>);
}

beforeEach(() => {
  updateSpy.mockClear();
  eqSpy.mockClear();
});

describe('SettingsView', () => {
  it('renders the form pre-populated with the current user values', () => {
    renderWithAccessibility(<SettingsView currentUser={currentUser} onUserUpdated={vi.fn()} />);

    expect(screen.getByLabelText(/full name/i)).toHaveValue('Sam Employee');
    expect(screen.getByLabelText(/phone number/i)).toHaveValue('+1 (555) 019-2834');
    expect(screen.getByLabelText(/work email address/i)).toHaveValue('sam.employee@axionhr.com');
    expect(screen.getByLabelText(/work email address/i)).toBeDisabled();
  });

  it('submits the form and calls the expected Supabase update', async () => {
    const user = userEvent.setup();
    const onUserUpdated = vi.fn();
    renderWithAccessibility(<SettingsView currentUser={currentUser} onUserUpdated={onUserUpdated} />);

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(updateSpy).toHaveBeenCalledWith({
      full_name: 'Sam Employee',
      phone: '+1 (555) 019-2834',
      address: '123 Elm St, Springfield, IL',
      avatar: 'AR',
      working_hours_start: '09:00',
      working_hours_end: '17:00',
    });
    expect(eqSpy).toHaveBeenCalledWith('id', 'user-1');
  });

  it('selecting a different avatar preset includes it in the saved payload', async () => {
    const user = userEvent.setup();
    renderWithAccessibility(<SettingsView currentUser={currentUser} onUserUpdated={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'DV' }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ avatar: 'DV' }));
  });

  it('renders exactly one address field, not a duplicate', () => {
    renderWithAccessibility(<SettingsView currentUser={currentUser} onUserUpdated={vi.fn()} />);

    const addressInputs = screen.getAllByDisplayValue('123 Elm St, Springfield, IL');
    expect(addressInputs).toHaveLength(1);
  });
});
