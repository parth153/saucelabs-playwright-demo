import { test, expect } from '../../src/fixtures/test.js';
import { EXPECTED_PRODUCT_COUNT, PRODUCTS } from '../../src/data/users.js';
import { annotate, Severity } from '../../src/utils/allure.js';

/* Authenticated via the shared storage state from the `setup` project. */
test.beforeEach(async ({ inventoryPage }) => {
  await inventoryPage.goto();
});

test.describe('inventory', () => {
  test('shows the full catalog', { tag: '@smoke' }, async ({ inventoryPage }) => {
    await annotate('Inventory', 'Catalog Display', Severity.BLOCKER);
    await expect(inventoryPage.items).toHaveCount(EXPECTED_PRODUCT_COUNT);
  });

  test('sorts by name A→Z and Z→A', async ({ inventoryPage }) => {
    await annotate('Inventory', 'Sorting', Severity.NORMAL);
    await inventoryPage.sortBy('az');
    const az = await inventoryPage.productNames();
    expect(az).toEqual([...az].sort((a, b) => a.localeCompare(b)));

    await inventoryPage.sortBy('za');
    const za = await inventoryPage.productNames();
    expect(za).toEqual([...za].sort((a, b) => b.localeCompare(a)));
  });

  test('sorts by price low→high and high→low', async ({ inventoryPage }) => {
    await annotate('Inventory', 'Sorting', Severity.NORMAL);
    await inventoryPage.sortBy('lohi');
    const lohi = await inventoryPage.productPrices();
    expect(lohi).toEqual([...lohi].sort((a, b) => a - b));

    await inventoryPage.sortBy('hilo');
    const hilo = await inventoryPage.productPrices();
    expect(hilo).toEqual([...hilo].sort((a, b) => b - a));
  });

  test('add then remove updates the cart badge', { tag: '@smoke' }, async ({ inventoryPage }) => {
    await annotate('Inventory', 'Add/Remove Cart', Severity.CRITICAL);
    expect(await inventoryPage.cartCount()).toBe(0);

    await inventoryPage.addToCart(PRODUCTS.backpack.id);
    await expect(inventoryPage.cartBadge).toHaveText('1');

    await inventoryPage.addToCart(PRODUCTS.bikeLight.id);
    await expect(inventoryPage.cartBadge).toHaveText('2');

    await inventoryPage.removeFromCart(PRODUCTS.backpack.id);
    await expect(inventoryPage.cartBadge).toHaveText('1');
    // The add button reappears once an item is removed.
    await expect(inventoryPage.addToCartButton(PRODUCTS.backpack.id)).toBeVisible();
  });

  test('opens a product detail page', async ({ inventoryPage, page }) => {
    await annotate('Inventory', 'Product Detail Navigation', Severity.NORMAL);
    await inventoryPage.openProduct(PRODUCTS.backpack.name);
    await expect(page).toHaveURL(/inventory-item\.html/);
    await expect(page.getByTestId('inventory-item-name')).toHaveText(PRODUCTS.backpack.name);
  });
});
