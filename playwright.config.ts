import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for LernZeit auth/onboarding E2E tests.
 *
 * The Lovable sandbox already runs Vite on http://localhost:8080, so we do NOT
 * start our own webServer here. When running locally, `bun dev` must be up.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',
    viewport: { width: 1280, height: 900 },
    locale: 'de-DE',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Sandbox ships chromium 1194 (headless_shell). Point Playwright there
        // to avoid the "browser not installed" download prompt.
        launchOptions: {
          executablePath:
            process.env.PLAYWRIGHT_CHROMIUM_PATH ||
            '/chromium_headless_shell-1194/chrome-linux/headless_shell',
          args: ['--no-sandbox'],
        },
      },
    },
  ],
});