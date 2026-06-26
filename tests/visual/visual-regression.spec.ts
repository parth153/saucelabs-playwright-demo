import { test, expect } from '../../src/fixtures/test.js';
import { CHECKOUT_INFO, PRODUCTS } from '../../src/data/users.js';
import { annotate, Severity } from '../../src/utils/allure.js';

/**
 * Pixel-level visual regression. Playwright stores one baseline per project
 * (browser + OS) under `*-snapshots/`, so running this file under the desktop,
 * mobile, and tablet projects also validates the responsive layouts.
 *
 * Generate/refresh baselines with: `npm run update-snapshots`.
 *
 * The login page is unauthenticated, so it opts out of the shared storage state.
 */
test.describe('visual regression', () => {
  test('login page', async ({ page }) => {
    await annotate('Visual Regression', 'Login Page', Severity.NORMAL);
    await test.step('open the login page logged out', async () => {
      await page.context().clearCookies();
      await page.goto('/');
    });
    await expect(page).toHaveScreenshot('login.png', { fullPage: true });
  });

  test('inventory page', { tag: '@smoke' }, async ({ inventoryPage, page }) => {
    await annotate('Visual Regression', 'Inventory Page', Severity.NORMAL);
    await inventoryPage.goto();
    await expect(inventoryPage.title).toBeVisible();
    await expect(page).toHaveScreenshot('inventory.png', { fullPage: true });
  });

  test('cart with items', async ({ inventoryPage, page }) => {
    await annotate('Visual Regression', 'Cart Page', Severity.NORMAL);
    await inventoryPage.goto();
    await inventoryPage.addToCart(PRODUCTS.backpack.id);
    await inventoryPage.addToCart(PRODUCTS.bikeLight.id);
    await inventoryPage.openCart();
    await expect(page).toHaveScreenshot('cart.png', { fullPage: true });
  });

  test('checkout overview', async ({ inventoryPage, cartPage, checkoutPage, page }) => {
    await annotate('Visual Regression', 'Checkout Overview', Severity.NORMAL);
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
    await expect(page).toHaveScreenshot('checkout-overview.png', { fullPage: true });
  });
});
