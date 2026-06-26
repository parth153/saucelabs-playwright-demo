import { test, expect } from '../../src/fixtures/test.js';
import { CHECKOUT_INFO, PRODUCTS, TAX_RATE } from '../../src/data/users.js';
import { annotate, Severity } from '../../src/utils/allure.js';

async function addTwoItemsAndCheckout({
  inventoryPage,
  cartPage,
}: {
  inventoryPage: import('../../src/pages/index.js').InventoryPage;
  cartPage: import('../../src/pages/index.js').CartPage;
}) {
  await inventoryPage.goto();
  await inventoryPage.addToCart(PRODUCTS.backpack.id);
  await inventoryPage.addToCart(PRODUCTS.bikeLight.id);
  await inventoryPage.openCart();
  await cartPage.checkout();
}

test.describe('checkout', () => {
  test(
    'completes the happy path',
    { tag: '@smoke' },
    async ({ inventoryPage, cartPage, checkoutPage, page }) => {
      await annotate('Checkout', 'Happy Path', Severity.BLOCKER);
      await addTwoItemsAndCheckout({ inventoryPage, cartPage });

      await checkoutPage.fillInformation(
        CHECKOUT_INFO.firstName,
        CHECKOUT_INFO.lastName,
        CHECKOUT_INFO.postalCode,
      );
      await checkoutPage.continue();
      await expect(page).toHaveURL(/checkout-step-two\.html/);

      await checkoutPage.finish();
      await expect(page).toHaveURL(/checkout-complete\.html/);
      await expect(checkoutPage.completeHeader).toHaveText('Thank you for your order!');
    },
  );

  test('item total, tax, and total are consistent', async ({
    inventoryPage,
    cartPage,
    checkoutPage,
  }) => {
    await annotate('Checkout', 'Pricing Calculation', Severity.CRITICAL);
    await addTwoItemsAndCheckout({ inventoryPage, cartPage });
    await checkoutPage.fillInformation(
      CHECKOUT_INFO.firstName,
      CHECKOUT_INFO.lastName,
      CHECKOUT_INFO.postalCode,
    );
    await checkoutPage.continue();

    const expectedItemTotal = PRODUCTS.backpack.price + PRODUCTS.bikeLight.price;
    const itemTotal = await checkoutPage.itemTotal();
    const tax = await checkoutPage.tax();
    const total = await checkoutPage.total();

    expect(itemTotal).toBeCloseTo(expectedItemTotal, 2);
    expect(tax).toBeCloseTo(itemTotal * TAX_RATE, 1);
    expect(total).toBeCloseTo(itemTotal + tax, 2);
  });

  test('requires the first name', async ({ inventoryPage, cartPage, checkoutPage }) => {
    await annotate('Checkout', 'Validation – Missing First Name', Severity.NORMAL);
    await addTwoItemsAndCheckout({ inventoryPage, cartPage });
    await checkoutPage.fillInformation('', CHECKOUT_INFO.lastName, CHECKOUT_INFO.postalCode);
    await checkoutPage.continue();
    await expect(checkoutPage.errorMessage).toHaveText('Error: First Name is required');
  });

  test('cancel from information returns to the cart', async ({
    inventoryPage,
    cartPage,
    checkoutPage,
    page,
  }) => {
    await annotate('Checkout', 'Cancel Flow', Severity.NORMAL);
    await addTwoItemsAndCheckout({ inventoryPage, cartPage });
    await checkoutPage.cancelButton.click();
    await expect(page).toHaveURL(/cart\.html/);
  });
});
