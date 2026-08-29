import { test, expect } from '@playwright/test';

// AppShell (app/components/AppShell.tsx) wraps every route and renders the
// sign-in screen until a Supabase session exists — no page ships dashboard
// content to a logged-out visitor. These smoke tests only need that gate to
// render correctly; they don't depend on a live Supabase backend.

test('shows the sign-in screen on the home page when logged out', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Pulse: AxionHR Well-Being Guardian/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByLabel('Work Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In to Portal' })).toBeVisible();
});

test('protects every route behind the sign-in gate, not just the home page', async ({ page }) => {
  await page.goto('/kudos');

  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});

test('requires both email and password before submitting', async ({ page }) => {
  await page.goto('/');

  const emailInput = page.getByLabel('Work Email');
  await expect(emailInput).toHaveAttribute('required', '');

  const passwordInput = page.getByLabel('Password');
  await expect(passwordInput).toHaveAttribute('required', '');
});
