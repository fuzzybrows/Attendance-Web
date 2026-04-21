import { test, expect } from '@playwright/test';

test.describe('Add Session from Calendar', () => {
  test('day click modal shows Add Session button for admin', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    // Click on a calendar day cell
    const dayCell = page.locator('.rbc-date-cell').first();
    await dayCell.click();

    // The day-click modal should show an "Add Session" button
    await expect(page.getByText(/add session/i).last()).toBeVisible({ timeout: 5000 });
  });

  test('Add Session modal opens with session form fields', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    // Click a day
    const dayCell = page.locator('.rbc-date-cell').first();
    await dayCell.click();

    // Click Add Session
    await page.getByText(/add session/i).last().click();

    // Modal should open with form fields
    await expect(page.getByText('Add New Session')).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder(/e\.g\. sunday service/i)).toBeVisible();
  });
});
