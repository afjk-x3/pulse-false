import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccessibilityProvider, useAccessibility } from './AccessibilityContext';

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

function TestConsumer() {
  const { fontScale, setFontScale, setHighContrast } = useAccessibility();
  return (
    <div>
      <span data-testid="scale">{fontScale}</span>
      <button onClick={() => setFontScale('large')}>set-large</button>
      <button onClick={() => setHighContrast(true)}>enable-contrast</button>
    </div>
  );
}

describe('AccessibilityProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.className = '';
  });

  it('applies the matching body class when the font scale changes', async () => {
    const user = userEvent.setup();
    render(
      <AccessibilityProvider>
        <TestConsumer />
      </AccessibilityProvider>
    );

    await user.click(screen.getByText('set-large'));

    expect(screen.getByTestId('scale')).toHaveTextContent('large');
    expect(document.body.classList.contains('text-large')).toBe(true);
  });

  it('toggles the high-contrast body class', async () => {
    const user = userEvent.setup();
    render(
      <AccessibilityProvider>
        <TestConsumer />
      </AccessibilityProvider>
    );

    await user.click(screen.getByText('enable-contrast'));

    expect(document.body.classList.contains('high-contrast')).toBe(true);
  });
});
