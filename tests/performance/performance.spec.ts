import { test, expect } from '../../src/fixtures/test.js';
import { chromium } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';
import { annotate, attachment, ContentType, Severity } from '../../src/utils/allure.js';
import { getLargestContentfulPaint, getNavigationTimings } from '../../src/utils/getWebVitals.js';
import { USERS } from '../../src/data/users.js';

/**
 * Performance budgets.
 *
 * Two layers:
 *  1. Navigation Timing + Web Vitals via the standard `performance` API — runs in
 *     every engine and gates on generous budgets.
 *  2. A full Lighthouse audit via `playwright-lighthouse` — Chromium-only, so it
 *     is skipped on other projects.
 *
 * Budgets are deliberately lenient: this is a public site over the internet, so
 * the point is to demonstrate budget gating, not to benchmark Sauce Labs.
 */

// Generous budgets (ms) to keep the demo stable across networks/CI.
const BUDGET = {
  domContentLoaded: 6000,
  load: 8000,
  ttfb: 3000,
  lcp: 6000,
};

test.describe('web vitals budgets', () => {
  test('inventory page meets navigation-timing budgets', async ({ inventoryPage, page }) => {
    await annotate(
      'Performance',
      'Navigation Timing Budgets',
      Severity.NORMAL,
      `Asserts TTFB < ${BUDGET.ttfb}ms, DOMContentLoaded < ${BUDGET.domContentLoaded}ms, load < ${BUDGET.load}ms.`,
    );
    await inventoryPage.goto();
    await expect(inventoryPage.title).toBeVisible();

    const timings = await getNavigationTimings(page);
    await attachment('navigation-timings.json', JSON.stringify(timings, null, 2), {
      contentType: ContentType.JSON,
    });

    expect(timings.ttfb).toBeLessThan(BUDGET.ttfb);
    expect(timings.domContentLoaded).toBeLessThan(BUDGET.domContentLoaded);
    expect(timings.load).toBeLessThan(BUDGET.load);
  });

  test('largest contentful paint is within budget (Chromium)', async ({
    inventoryPage,
    page,
  }, testInfo) => {
    await annotate(
      'Performance',
      'LCP Budget',
      Severity.NORMAL,
      `Asserts Largest Contentful Paint < ${BUDGET.lcp}ms via PerformanceObserver. Chromium only.`,
    );
    test.skip(
      testInfo.project.name !== 'chromium',
      'LCP via PerformanceObserver is only reliable in Chromium',
    );
    await inventoryPage.goto();
    const lcp = await getLargestContentfulPaint(page);
    expect(lcp).toBeGreaterThan(0);
    expect(lcp).toBeLessThan(BUDGET.lcp);
  });

  test('performance_glitch_user is measurably slower (detection demo)', async ({
    loginAs,
    page,
  }) => {
    await annotate(
      'Performance',
      'Slow User Detection',
      Severity.NORMAL,
      'Demonstrates performance budget gating by measuring login time for the deliberately slow performance_glitch_user account.',
    );
    const start = Date.now();
    await loginAs('performanceGlitch');
    await expect(page.getByText('Products', { exact: true })).toBeVisible();
    const elapsed = Date.now() - start;

    await attachment('glitch-user-login-ms.txt', String(elapsed), {
      contentType: ContentType.TEXT,
    });
    // Documented, non-flaky: the deliberately-glitched account is detectably
    // slower than an instantaneous load.
    expect(elapsed, `glitch login took ${elapsed}ms`).toBeGreaterThan(1000);
    expect(USERS.performanceGlitch.note).toContain('delay');
  });
});

test.describe('lighthouse audit', () => {
  test('inventory page passes Lighthouse category thresholds', async ({}, testInfo) => {
    await annotate(
      'Performance',
      'Lighthouse Audit',
      Severity.NORMAL,
      'Full Lighthouse audit via playwright-lighthouse. Asserts performance ≥ 50, accessibility ≥ 50, best-practices ≥ 50, seo ≥ 50. Chromium only.',
    );
    test.skip(testInfo.project.name !== 'chromium', 'Lighthouse only runs against Chromium');
    test.setTimeout(120_000);

    const port = 9222;
    const browser = await chromium.launch({ args: [`--remote-debugging-port=${port}`] });
    try {
      const context = await browser.newContext({ storageState: '.auth/standard_user.json' });
      const page = await context.newPage();
      await page.goto('https://www.saucedemo.com/inventory.html');

      await playAudit({
        page,
        port,
        thresholds: {
          performance: 50,
          accessibility: 50,
          'best-practices': 50,
          seo: 50,
        },
        reports: {
          formats: { html: true },
          name: `lighthouse-${Date.now()}`,
          directory: testInfo.outputDir,
        },
      });
    } finally {
      await browser.close();
    }
  });
});
