import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.DATIVA_E2E_PORT ?? 4300);
const HOST = '127.0.0.1';

export default defineConfig({
  testDir: './specs',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  timeout: 45_000,
  expect: { timeout: 12_000 },
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    viewport: { width: 1600, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 900 } },
    },
  ],
  webServer: {
    command: `npx ng serve dativa-web --port ${PORT} --host ${HOST}`,
    url: `http://${HOST}:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    cwd: '..',
  },
});
