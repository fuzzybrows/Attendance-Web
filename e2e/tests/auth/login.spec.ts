import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // unauthenticated

  test('shows the login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder('Enter your email')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Enter your email').fill('wrong@example.com');
    await page.getByPlaceholder('Enter your password').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 10000 });
  });

  test('redirects to dashboard after successful login', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Enter your email').fill(process.env.ADMIN_EMAIL || 'e2e-admin@test.com');
    await page.getByPlaceholder('Enter your password').fill(process.env.ADMIN_PASSWORD || 'E2eTestPass!2026');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL('/', { timeout: 15000 });
  });

  test('shows forgot password link', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/forgot your password/i)).toBeVisible();
  });

  test('password visibility toggle works', async ({ page }) => {
    await page.goto('/login');
    const passwordInput = page.getByPlaceholder('Enter your password');
    await passwordInput.fill('testpassword');

    // Initially type="password"
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle
    await page.getByTestId('show-password-toggle').click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click again to hide
    await page.getByTestId('show-password-toggle').click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });
});
