import { test, expect } from '@playwright/test';

test.describe('Sessions Page', () => {
  test('renders the sessions list', async ({ page }) => {
    await page.goto('/sessions');
    await expect(page.getByText(/all sessions/i)).toBeVisible();
    await page.waitForLoadState('networkidle');
  });

  test('shows Add Session button for admin', async ({ page }) => {
    await page.goto('/sessions');
    await expect(page.getByText(/\+ add session/i)).toBeVisible();
  });

  test('opens Add Session modal', async ({ page }) => {
    await page.goto('/sessions');
    await page.getByText(/\+ add session/i).click();
    await expect(page.getByText('Add New Session')).toBeVisible();
    await expect(page.getByPlaceholder(/e\.g\. sunday service/i)).toBeVisible();
  });

  test('filters sessions by status', async ({ page }) => {
    await page.goto('/sessions');
    await page.waitForLoadState('networkidle');

    // Click the "scheduled" filter
    await page.getByRole('button', { name: /^scheduled$/i }).click();

    // E2E seeded sessions with status "scheduled" should be visible
    await expect(page.getByText('E2E Sunday Service')).toBeVisible({ timeout: 5000 });
  });

  test('opens session detail modal on row click', async ({ page }) => {
    await page.goto('/sessions');
    await page.waitForLoadState('networkidle');

    // Click on a session
    await page.getByText('E2E Sunday Service').click();

    // Session Details modal should open
    await expect(page.getByText('Session Details')).toBeVisible();
    await expect(page.getByText('View Attendance')).toBeVisible();
    await expect(page.getByText('Close')).toBeVisible();
  });

  test('edit modal shows Save Changes button', async ({ page }) => {
    await page.goto('/sessions');
    await page.waitForLoadState('networkidle');

    // Open detail modal
    await page.getByText('E2E Sunday Service').click();
    await expect(page.getByText('Session Details')).toBeVisible();

    // Click Edit Details
    await page.getByText('Edit Details').click();

    // Should switch to edit mode
    await expect(page.getByText('Edit Session Details')).toBeVisible();

    // The critical regression test: Save Changes must exist
    await expect(page.getByText('Save Changes')).toBeVisible();
    await expect(page.getByText('Cancel')).toBeVisible();
  });

  test('search filters sessions', async ({ page }) => {
    await page.goto('/sessions');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('E2E Sunday');

    await expect(page.getByText('E2E Sunday Service')).toBeVisible();
  });
});
