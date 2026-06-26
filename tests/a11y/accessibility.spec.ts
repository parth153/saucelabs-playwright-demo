import { test, expect } from '../../src/fixtures/test.js';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { createHtmlReport } from 'axe-html-reporter';
import { annotate, attachment, ContentType, step, Severity } from '../../src/utils/allure.js';
import { CHECKOUT_INFO, PRODUCTS } from '../../src/data/users.js';

/**
 * Accessibility scanning with axe-core.
 *
 * saucedemo is a third-party demo with known a11y gaps, so we don't hard-fail on
 * every rule. Instead each scan:
 *  - attaches a human-readable HTML report AND the raw JSON to the test (view via
 *    `npm run report` → open the test → attachments),
 *  - soft-asserts the total count (surfaces everything without breaking), and
 *  - hard-asserts on `critical`-impact violations that are NOT in the documented
 *    known-issues allowlist — i.e. it gates on *regressions*, the realistic way
 *    to run axe against an app with a pre-existing backlog.
 */

/**
 * Documented pre-existing critical violations on saucedemo. New critical issues
 * outside this set fail the build; these known ones are tracked, not gated.
 *  - `select-name`: the product-sort <select> has no accessible name.
 */
const KNOWN_CRITICAL = new Set<string>(['select-name']);

async function scanAndReport(page: Page, name: string) {
  let results: Awaited<ReturnType<InstanceType<typeof AxeBuilder>['analyze']>>;

  await step(`Run axe WCAG 2.x scan on "${name}"`, async () => {
    results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  });

  await step('Attach HTML and JSON violation reports', async () => {
    // Use Allure's native attachment() so the report is properly linked in the
    // Allure UI (testInfo.attach() only reaches the Playwright HTML reporter).
    const html = createHtmlReport({
      results,
      options: {
        projectKey: 'saucedemo',
        doNotCreateReportFile: true,
        reportFileName: `axe-${name}.html`,
      },
    });
    await attachment(`axe-${name}.html`, html, { contentType: ContentType.HTML });
    await attachment(`axe-${name}.json`, JSON.stringify(results!.violations, null, 2), {
      contentType: ContentType.JSON,
    });
  });

  // Surface the full count without failing.
  await step(
    `Soft-assert total violation count (${results!.violations.length} found)`,
    async () => {
      expect
        .soft(
          results.violations.length,
          `axe reported ${results.violations.length} total violations on "${name}" ` +
            `(${results!.violations.map((v) => v.id).join(', ')})`,
        )
        .toBeGreaterThanOrEqual(0);
    },
  );

  // Gate on NEW critical violations only.
  await step('Hard-assert no new critical violations (outside known allowlist)', async () => {
    const regressions = results!.violations.filter(
      (v) => v.impact === 'critical' && !KNOWN_CRITICAL.has(v.id),
    );
    expect(
      regressions,
      `New critical a11y violations on "${name}": ${regressions.map((v) => v.id).join(', ')}`,
    ).toEqual([]);
  });
}

test.describe('accessibility (axe)', () => {
  test('login page', { tag: '@smoke' }, async ({ page }) => {
    await annotate(
      'Accessibility',
      'WCAG Scan – Login',
      Severity.CRITICAL,
      'Runs axe WCAG 2.x scan on the unauthenticated login page and gates on new critical violations.',
    );
    await page.context().clearCookies();
    await page.goto('/');
    await scanAndReport(page, 'login');
  });

  test('inventory page', async ({ inventoryPage, page }) => {
    await annotate(
      'Accessibility',
      'WCAG Scan – Inventory',
      Severity.CRITICAL,
      'Runs axe WCAG 2.x scan on the fully loaded product listing page.',
    );
    await inventoryPage.goto();
    await expect(inventoryPage.title).toBeVisible();
    await scanAndReport(page, 'inventory');
  });

  test('cart page', async ({ inventoryPage, page }) => {
    await annotate(
      'Accessibility',
      'WCAG Scan – Cart',
      Severity.CRITICAL,
      'Adds an item then scans the cart page so axe sees real cart content.',
    );
    await inventoryPage.goto();
    await inventoryPage.addToCart(PRODUCTS.backpack.id);
    await inventoryPage.openCart();
    await scanAndReport(page, 'cart');
  });

  test('checkout information page', async ({ inventoryPage, cartPage, page }) => {
    await annotate(
      'Accessibility',
      'WCAG Scan – Checkout Information',
      Severity.CRITICAL,
      'Scans the checkout step-one form (first/last name, postal code).',
    );
    await inventoryPage.goto();
    await inventoryPage.addToCart(PRODUCTS.backpack.id);
    await inventoryPage.openCart();
    await cartPage.checkout();
    await scanAndReport(page, 'checkout');
  });

  test('checkout overview page', async ({ inventoryPage, cartPage, checkoutPage, page }) => {
    await annotate(
      'Accessibility',
      'WCAG Scan – Checkout Overview',
      Severity.CRITICAL,
      'Scans the order summary page (item total, tax, finish button).',
    );
    await inventoryPage.goto();
    await inventoryPage.addToCart(PRODUCTS.backpack.id);
    await inventoryPage.openCart();
    await cartPage.checkout();
    await checkoutPage.fillInformation(
      CHECKOUT_INFO.firstName,
      CHECKOUT_INFO.lastName,
      CHECKOUT_INFO.postalCode,
    );
    await checkoutPage.continue();
    await scanAndReport(page, 'checkout-overview');
  });
});

test.describe('keyboard navigation', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('the login form is operable by keyboard', async ({ loginPage, page }) => {
    await annotate(
      'Accessibility',
      'Keyboard Navigation',
      Severity.CRITICAL,
      'Verifies that a keyboard-only user can tab through the login form, ' +
        'type credentials, and submit with Enter — the minimum viable keyboard flow.',
    );
    await loginPage.goto();

    await step('Tab to username field and type', async () => {
      await page.keyboard.press('Tab');
      await expect(loginPage.usernameInput).toBeFocused();
      await page.keyboard.type('standard_user');
    });

    await step('Tab to password field and type', async () => {
      await page.keyboard.press('Tab');
      await expect(loginPage.passwordInput).toBeFocused();
      await page.keyboard.type('secret_sauce');
    });

    await step('Submit with Enter and assert successful login', async () => {
      // Submit via Enter from within the password field.
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/inventory\.html/);
    });
  });
});
