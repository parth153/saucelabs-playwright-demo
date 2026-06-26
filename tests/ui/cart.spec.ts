import { test, expect } from '../../src/fixtures/test.js';
import { PRODUCTS } from '../../src/data/users.js';
import { annotate, Severity } from '../../src/utils/allure.js';

test.describe('cart', () => {
  test(
    'reflects items added from the inventory',
    { tag: '@smoke' },
    async ({ inventoryPage, cartPage }) => {
      await annotate('Cart', 'Items Reflected in Cart', Severity.CRITICAL);
      await inventoryPage.goto();
      await inventoryPage.addToCart(PRODUCTS.backpack.id);
      await inventoryPage.addToCart(PRODUCTS.boltTShirt.id);
      await inventoryPage.openCart();

      await expect(cartPage.items).toHaveCount(2);
      expect(await cartPage.itemNamesText()).toEqual(
        expect.arrayContaining([PRODUCTS.backpack.name, PRODUCTS.boltTShirt.name]),
      );
    },
  );

  test('removing an item updates the cart', async ({ inventoryPage, cartPage }) => {
    await annotate('Cart', 'Remove Item', Severity.CRITICAL);
    await inventoryPage.goto();
    await inventoryPage.addToCart(PRODUCTS.backpack.id);
    await inventoryPage.addToCart(PRODUCTS.bikeLight.id);
    await inventoryPage.openCart();

    await cartPage.removeFromCart(PRODUCTS.backpack.id);
    await expect(cartPage.items).toHaveCount(1);
    expect(await cartPage.itemNamesText()).toEqual([PRODUCTS.bikeLight.name]);
  });

  test('continue shopping returns to the inventory', async ({ inventoryPage, cartPage, page }) => {
    await annotate('Cart', 'Continue Shopping', Severity.NORMAL);
    await inventoryPage.goto();
    await inventoryPage.openCart();
    await cartPage.continueShopping();
    await expect(page).toHaveURL(/inventory\.html/);
  });

  test('cart persists across a reload', async ({ inventoryPage, cartPage, page }) => {
    await annotate('Cart', 'Cart Persistence', Severity.NORMAL);
    await inventoryPage.goto();
    await inventoryPage.addToCart(PRODUCTS.backpack.id);
    await inventoryPage.openCart();
    await page.reload();
    await expect(cartPage.items).toHaveCount(1);
  });
});
