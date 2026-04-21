import { test, expect } from '@playwright/test';

test.describe('Calendar Grid', () => {
  test('renders the calendar grid', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    // Calendar container should be visible
    await expect(page.locator('.rbc-calendar, [data-testid="mock-calendar"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows admin action buttons', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    // Admin buttons
    await expect(page.getByText(/export/i).first()).toBeVisible();
    await expect(page.getByText(/availability matrix/i)).toBeVisible();
  });

  test('export dropdown shows sub-menus', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    await page.getByText(/export ▾/i).click();

    await expect(page.getByText(/export schedule/i)).toBeVisible();
    await expect(page.getByText(/export availability/i)).toBeVisible();
  });

  test('can switch calendar views', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    // Switch to week view
    const weekBtn = page.locator('.rbc-btn-group button', { hasText: /week/i });
    if (await weekBtn.isVisible()) {
      await weekBtn.click();
      await expect(page.locator('.rbc-time-view')).toBeVisible({ timeout: 5000 });
    }
  });

  test('shows seeded sessions as events', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    // Navigate to the month containing the seeded sessions
    // The seeded sessions are in the current/next week
    await expect(page.getByText(/e2e/i).first()).toBeVisible({ timeout: 10000 });
  });
});
