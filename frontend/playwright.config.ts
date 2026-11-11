import { defineConfig, devices } from '@playwright/test';

/**
 * E2E (spec 007): the production build served by `vite preview`, with the API mocked in the
 * browser (`e2e/mockApi.ts`), so the suite never touches the shared database or the gateway.
 */
const PORT = 4174;
const CI = Boolean(process.env.CI);

// iPhone SE: the smallest screen the app supports (AGENTS.md).
const mobile = { viewport: { width: 375, height: 667 }, hasTouch: true };

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-CO',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { slowMo: Number(process.env.E2E_SLOWMO ?? 0) },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], ...mobile } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], ...mobile } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], ...mobile } },
  ],
  webServer: {
    command: `npx vite build --logLevel warn && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    env: { VITE_API_URL: 'http://api.mock' },
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
});
