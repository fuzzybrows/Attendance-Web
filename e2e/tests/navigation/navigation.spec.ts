import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('admin sees all navigation links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /calendar/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sessions/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /members/i })).toBeVisible();
  });

  test('navigating to calendar works', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /calendar/i }).click();
    await expect(page).toHaveURL('/calendar');
  });

  test('navigating to sessions works', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /sessions/i }).click();
    await expect(page).toHaveURL('/sessions');
  });

  test('navigating to members works', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /members/i }).click();
    await expect(page).toHaveURL('/members');
  });

  test('logout redirects to login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find and click logout
    const logoutBtn = page.getByText(/logout|sign out/i);
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    }
  });
});
