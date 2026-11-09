import { defineConfig, devices } from '@playwright/test';

import { BYPASS_STATE_PATH, useVercelBypass } from './tests/e2e/global-setup';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:9333';
const isCI = !!process.env.CI;
// On protected Vercel previews the global setup swaps the automation-bypass
// secret for a cookie saved to BYPASS_STATE_PATH; contexts then start signed in
// for every request, including service-worker fetches page headers can't reach.
const vercelBypass = useVercelBypass();

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: !isCI,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? 'github' : [['html', { open: 'never' }], ['list']],
  use: {
    // Pre-installed Chromium for sandboxes where `playwright install` cannot download (PW_CHROMIUM_PATH).
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
    baseURL,
    storageState: vercelBypass ? BYPASS_STATE_PATH : undefined,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'webkit-mobile',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run test:serve',
        url: 'http://localhost:9333',
        reuseExistingServer: !isCI,
        timeout: 120000,
      },
});
