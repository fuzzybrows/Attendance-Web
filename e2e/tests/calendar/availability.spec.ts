import { test, expect } from '@playwright/test';

test.describe('Availability Matrix', () => {
  test('toggles availability matrix view', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    // Click Availability Matrix button
    await page.getByText(/availability matrix/i).click();

    // Matrix view should appear
    await expect(page.getByText(/availability matrix —/i)).toBeVisible({ timeout: 10000 });
  });

  test('matrix shows member rows', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    await page.getByText(/availability matrix/i).click();
    await expect(page.getByText(/availability matrix —/i)).toBeVisible({ timeout: 10000 });

    // Should show a table with Member column header
    await expect(page.locator('th', { hasText: /member/i })).toBeVisible();
  });

  test('matrix has month navigation buttons', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    await page.getByText(/availability matrix/i).click();
    await expect(page.getByText(/availability matrix —/i)).toBeVisible({ timeout: 10000 });

    // Previous and Next buttons should be visible
    const prevBtn = page.getByTitle('Previous month');
    const nextBtn = page.getByTitle('Next month');
    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();
  });

  test('month navigation changes the displayed month', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    await page.getByText(/availability matrix/i).click();
    const header = page.getByText(/availability matrix —/i);
    await expect(header).toBeVisible({ timeout: 10000 });

    // Get current month text
    const initialText = await header.innerText();

    // Click next month
    await page.getByTitle('Next month').click();

    // Header text should change
    await expect(header).not.toHaveText(initialText, { timeout: 5000 });
  });

  test('can return to calendar view from matrix', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    // Switch to matrix
    await page.getByText(/availability matrix/i).click();
    await expect(page.getByText(/availability matrix —/i)).toBeVisible({ timeout: 10000 });

    // Switch back to calendar
    await page.getByText(/calendar view/i).click();

    // Calendar should be visible again
    await expect(page.locator('.rbc-calendar').first()).toBeVisible({ timeout: 5000 });
  });
});
