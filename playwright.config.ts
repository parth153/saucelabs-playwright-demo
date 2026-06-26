import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the saucedemo.com E2E suite.
 *
 * Highlights:
 * - `testIdAttribute: 'data-test'` so `getByTestId(...)` maps onto saucedemo's
 *   own `data-test` attributes (the recommended, resilient locator strategy).
 * - A `setup` project performs one real login and saves storage state; the
 *   functional/visual/network/etc. projects reuse it via `dependencies` so most
 *   specs start authenticated (faster, less flaky).
 * - Coverage across three engines (Chromium/Firefox/WebKit), two branded
 *   channels (Edge/Chrome), and three emulated devices (phone/phone/tablet).
 *
 * See CLAUDE.md for the visual-baseline / OS-parity caveats.
 */

export const BASE_URL = process.env.BASE_URL ?? 'https://www.saucedemo.com';

/** Storage state produced by `src/auth.setup.ts`. */
export const STORAGE_STATE = '.auth/standard_user.json';

/**
 * Branded channels (real Edge / Chrome) require those apps to be installed on
 * the machine, which isn't guaranteed everywhere. They're therefore opt-in:
 * set `INCLUDE_BRANDED=1` (CI does, after installing the msedge/chrome channels)
 * to add the `edge` and `google-chrome` projects. The bundled engines and the
 * emulated devices always run.
 */
const includeBranded = process.env.INCLUDE_BRANDED === '1';

const brandedProjects = includeBranded
  ? [
      {
        name: 'edge',
        use: { ...devices['Desktop Edge'], channel: 'msedge', storageState: STORAGE_STATE },
        dependencies: ['setup'],
      },
      {
        name: 'google-chrome',
        use: { ...devices['Desktop Chrome'], channel: 'chrome', storageState: STORAGE_STATE },
        dependencies: ['setup'],
      },
    ]
  : [];

export default defineConfig({
  testDir: './tests',
  /* Run every spec in a file in parallel. */
  fullyParallel: true,
  /* Fail the build on CI if `test.only` was left in the source. */
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        detail: true, // include fixture setup/teardown steps
        suiteTitle: false, // use describe block names instead of file names for suite titles
        categories: [
          {
            name: 'Visual Regression Failures',
            messageRegex: '.*toHaveScreenshot.*',
            matchedStatuses: ['failed'],
          },
          {
            name: 'A11y Regressions',
            messageRegex: '.*critical a11y violations.*',
            matchedStatuses: ['failed'],
          },
          {
            name: 'Network Failures',
            messageRegex: '.*failed responses.*|.*waitForResponse.*',
            matchedStatuses: ['failed'],
          },
        ],
        environmentInfo: {
          baseUrl: process.env.BASE_URL ?? 'https://www.saucedemo.com',
          nodeVersion: process.version,
        },
      },
    ],
  ],

  use: {
    baseURL: BASE_URL,
    testIdAttribute: 'data-test',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Tolerances for visual regression snapshots. */
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    },
  },

  projects: [
    /* Authenticates once and writes STORAGE_STATE. Lives in `src/`, so it needs
       its own testDir (the global testDir only covers `./tests`). */
    {
      name: 'setup',
      testDir: './src',
      testMatch: /auth\.setup\.ts/,
    },

    /* ---- Desktop engines ---- */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },

    /* ---- Branded desktop channels (real Edge / Chrome). Opt-in via
       INCLUDE_BRANDED=1 since they require the apps to be installed. ---- */
    ...brandedProjects,

    /* ---- Device emulation (viewport, touch, deviceScaleFactor, mobile UA) ---- */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
    {
      name: 'tablet',
      use: { ...devices['iPad Pro 11'], storageState: STORAGE_STATE },
      dependencies: ['setup'],
    },
  ],
});
