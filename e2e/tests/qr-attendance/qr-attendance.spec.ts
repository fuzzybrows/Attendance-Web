import { test, expect } from '@playwright/test';

test.describe('QR Attendance Page', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // public page

  test('renders the QR attendance page', async ({ page }) => {
    await page.goto('/qr-attendance');
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
