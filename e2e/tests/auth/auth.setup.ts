/**
 * Auth setup: logs in as admin and saves browser storage state
 * so subsequent tests skip the login flow.
 */
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const adminFile = path.join(__dirname, '..', 'fixtures', '.auth', 'admin.json');

setup('authenticate as admin', async ({ page }) => {
  // Navigate to login
  await page.goto('/login');

  // Fill credentials
  await page.getByPlaceholder('Enter your email').fill(process.env.ADMIN_EMAIL || 'e2e-admin@test.com');
  await page.getByPlaceholder('Enter your password').fill(process.env.ADMIN_PASSWORD || 'E2eTestPass!2026');

  // The reCAPTCHA in dev/test mode should auto-pass or use the test key.
  // If using the Google test key (6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI), it auto-passes.

  // Submit
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard
  await expect(page).toHaveURL('/', { timeout: 15000 });

  // Save auth state
  await page.context().storageState({ path: adminFile });
});
