import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('renders the dashboard page', async ({ page }) => {
    await page.goto('/');
    // Dashboard should load without redirecting to /login
    await expect(page).toHaveURL('/');
  });

  test('shows navigation links for admin', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /calendar/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sessions/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /members/i })).toBeVisible();
  });

  test('shows attendance overview section', async ({ page }) => {
    await page.goto('/');
    // Wait for data to load
    await page.waitForLoadState('networkidle');
    // The dashboard should contain some content
    await expect(page.locator('.glass-card').first()).toBeVisible();
  });
});
