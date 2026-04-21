import { test, expect } from '@playwright/test';

test.describe('Forgot Password Page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('navigates from login to forgot password', async ({ page }) => {
    await page.goto('/login');
    await page.getByText(/forgot your password/i).click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test('shows the reset password form', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByText(/reset/i).first()).toBeVisible();
  });
});
