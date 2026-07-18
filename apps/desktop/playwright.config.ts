import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 45_000,
  expect: {
    timeout: 8_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
      scale: 'css',
    },
  },
  reporter: isCI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  use: {
    baseURL: 'http://127.0.0.1:41783',
    colorScheme: 'dark',
    locale: 'en-US',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm dev:test',
    url: 'http://127.0.0.1:41783',
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'browser',
      testMatch: /workflow\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 960 },
      },
    },
    {
      name: 'a11y',
      testMatch: /accessibility\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 960 },
      },
    },
    {
      name: 'visual',
      testMatch: /visual\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        deviceScaleFactor: 1,
        viewport: { width: 1440, height: 960 },
      },
    },
    {
      name: 'electron',
      testMatch: /electron\.spec\.ts/,
    },
    {
      name: 'raw',
      testMatch: /raw\.spec\.ts/,
    },
  ],
});
