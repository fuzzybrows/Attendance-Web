import { test, expect } from '@playwright/test';

test.describe('Members Management', () => {
  test('renders the members list', async ({ page }) => {
    await page.goto('/members');
    await expect(page.getByText(/members/i).first()).toBeVisible();
    await page.waitForLoadState('networkidle');
  });

  test('members are sorted by last name', async ({ page }) => {
    await page.goto('/members');
    await page.waitForLoadState('networkidle');

    // Get all member name cells
    const nameElements = page.locator('[data-testid*="member-name"], td:first-child');
    const count = await nameElements.count();
    if (count > 1) {
      // Verify alphabetical order by last name
      const names: string[] = [];
      for (let i = 0; i < Math.min(count, 10); i++) {
        names.push(await nameElements.nth(i).innerText());
      }
      // Names should already be in order since the backend sorts by last_name
      const sorted = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sorted);
    }
  });

  test('shows Add Member button', async ({ page }) => {
    await page.goto('/members');
    await expect(page.getByText(/add member/i)).toBeVisible();
  });

  test('opens Add Member modal', async ({ page }) => {
    await page.goto('/members');
    await page.getByText(/add member/i).click();
    await expect(page.getByText(/first name/i)).toBeVisible();
    await expect(page.getByText(/last name/i)).toBeVisible();
    await expect(page.getByText(/email/i).first()).toBeVisible();
  });

  test('search filters members', async ({ page }) => {
    await page.goto('/members');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('Alice');

    // Should filter to show Alice
    await expect(page.getByText('Alice')).toBeVisible();
  });

  test('shows disabled badge for inactive members', async ({ page }) => {
    await page.goto('/members');
    await page.waitForLoadState('networkidle');

    // Charlie was seeded as inactive
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('Charlie');

    // Should show disabled indicator
    await expect(page.getByText(/disabled/i).first()).toBeVisible({ timeout: 5000 });
  });
});
