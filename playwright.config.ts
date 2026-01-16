import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Global timeout for each test */
  timeout: 60 * 1000, // 60 seconds per test (increased from default 30s)
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['html'],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    /* API Gateway URL */
    extraHTTPHeaders: {
      // Will be set dynamically in tests
    },

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI ? undefined : {
    command: 'docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --build',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for services to start
    env: {
      NODE_ENV: 'test',
      API_GATEWAY_SECRET: 'test-secret-e2e',
      MONGODB_URI: 'mongodb://localhost:27017/club_e2e_test',
      POSTGRES_URL: 'postgresql://postgres:postgres@localhost:5432/auth_e2e_test',
    },
  },

  /* Timeout settings - increased for CI stability */
  timeout: process.env.CI ? 60000 : 30000,
  expect: {
    timeout: process.env.CI ? 20000 : 10000,
  },
});
