import { test, expect } from '@playwright/test';

test.describe('Statistics Page', () => {
  test('renders the statistics page', async ({ page }) => {
    await page.goto('/stats');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.glass-card').first()).toBeVisible({ timeout: 10000 });
  });
});
