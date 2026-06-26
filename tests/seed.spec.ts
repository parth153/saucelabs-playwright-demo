import { test, expect } from '@playwright/test';

/**
 * Seed test for Playwright Agents (planner / generator / healer).
 *
 * The generator agent runs this file to "boot" into the application before it
 * writes new tests, so it establishes the standard starting point and documents
 * the conventions the rest of this repo follows:
 *
 *  - Base URL comes from `playwright.config.ts` (`baseURL`), so use relative
 *    paths like `/`, `/inventory.html`, `/cart.html`.
 *  - Locators: prefer `getByTestId(...)`. The config sets
 *    `testIdAttribute: 'data-test'`, which maps onto saucedemo's own `data-test`
 *    attributes (e.g. `username`, `password`, `login-button`,
 *    `add-to-cart-sauce-labs-backpack`, `shopping-cart-link`,
 *    `product-sort-container`, `firstName`, `continue`, `finish`).
 *  - Credentials: `standard_user` / `secret_sauce`. Other accounts
 *    (`locked_out_user`, `problem_user`, `performance_glitch_user`, ...) exercise
 *    edge cases. See `src/data/users.ts`.
 *  - Reusable Page Objects live in `src/pages/`; the extended `test` with page
 *    fixtures lives in `src/fixtures/test.ts` — prefer those in generated specs.
 *
 * This seed opts out of the shared storage state so it demonstrates the full
 * login entry point.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('seed', () => {
  test('log in and land on the inventory', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('username').fill('standard_user');
    await page.getByTestId('password').fill('secret_sauce');
    await page.getByTestId('login-button').click();

    await expect(page).toHaveURL(/inventory\.html/);
    await expect(page.getByText('Products', { exact: true })).toBeVisible();
  });
});
