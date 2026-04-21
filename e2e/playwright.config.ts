import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const authFile = path.resolve(__dirname, './fixtures/.auth/admin.json');
const hasAuthState = fs.existsSync(authFile);

// Use system Chrome to avoid sandbox permission issues on macOS
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  timeout: 30_000,

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    },
    headless: true,
  },

  globalSetup: './scripts/seed.ts',
  globalTeardown: './scripts/teardown.ts',

  projects: [
    /* 1. Unauthenticated tests — no setup dependency */
    {
      name: 'no-auth',
      testMatch: [
        '**/auth/login.spec.ts',
        '**/auth/forgot-password.spec.ts',
        '**/qr-attendance/*.spec.ts',
      ],
      use: {
        storageState: { cookies: [], origins: [] },
      },
    },
    /* 2. Auth setup — logs in and saves state */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    /* 3. Authenticated tests — depend on auth setup */
    {
      name: 'authenticated',
      testIgnore: [
        '**/auth/login.spec.ts',
        '**/auth/forgot-password.spec.ts',
        '**/auth/auth.setup.ts',
        '**/qr-attendance/*.spec.ts',
      ],
      use: {
        storageState: hasAuthState
          ? './fixtures/.auth/admin.json'
          : { cookies: [], origins: [] },
      },
      dependencies: ['setup'],
    },
  ],
});
