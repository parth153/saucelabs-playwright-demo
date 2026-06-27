// spec: specs/coverage-showcase.md
// seed: tests/seed.spec.ts

import { test, expect, USERS } from '../../src/fixtures/test.js';
import { PRODUCTS, CHECKOUT_INFO } from '../../src/data/users.js';
import { annotate, Severity } from '../../src/utils/allure.js';

test.describe('problem_user account', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('problem_user can log in and reaches the inventory', async ({
    page,
    loginAs,
    inventoryPage,
  }) => {
    await annotate('problem_user', 'Login', Severity.NORMAL);

    // 1. Declare test.use at describe block level so no shared auth is loaded.
    // 2. Call loginAs('problem') to navigate to the login page and authenticate.
    await loginAs('problem');

    // expect: The page URL should match /inventory\.html/
    await expect(page).toHaveURL(/inventory\.html/);

    // expect: The Products heading should be visible
    await expect(page.getByText('Products', { exact: true })).toBeVisible();

    // 3. Assert that inventory items have count 6.
    // expect: All six catalog items are displayed
    await expect(inventoryPage.items).toHaveCount(6);
  });

  test('problem_user inventory shows broken images (sl-404 placeholder for all products)', async ({
    page,
    loginAs,
    inventoryPage,
  }) => {
    await annotate('problem_user', 'Broken Images', Severity.NORMAL);

    // 1. Login as problem_user
    await loginAs('problem');
    await inventoryPage.goto();

    // 2. Collect each product image element's src attribute using the correct data-test pattern.
    //    Images use data-test="inventory-item-{product-id}-img"
    const srcs = await page
      .locator('.inventory_item img')
      .evaluateAll((imgs) => imgs.map((img) => img.getAttribute('src') ?? ''));

    // expect: All six product image elements point to the same sl-404 placeholder path
    expect(srcs).toHaveLength(6);
    for (const src of srcs) {
      expect(src).toContain('sl-404');
    }
  });

  test('problem_user sorting does not reorder the inventory list', async ({
    loginAs,
    inventoryPage,
  }) => {
    await annotate('problem_user', 'Sorting Defect', Severity.NORMAL);

    // 1. Login as problem_user
    await loginAs('problem');
    await inventoryPage.goto();

    // 2. Call sortBy('za') to select Name (Z to A).
    await inventoryPage.sortBy('za');

    // Collect product names via inventoryPage.productNames()
    const namesAfterZA = await inventoryPage.productNames();

    // expect: The returned array is NOT in Z-to-A descending order — it stays A-to-Z (broken sort)
    const sortedZA = [...namesAfterZA].sort((a, b) => b.localeCompare(a));
    expect(namesAfterZA).not.toEqual(sortedZA);

    // 3. Call sortBy('lohi') to select Price (low to high).
    await inventoryPage.sortBy('lohi');

    // 4. Collect product prices via inventoryPage.productPrices()
    const pricesAfterLoHi = await inventoryPage.productPrices();

    // expect: The returned array is NOT sorted ascending — confirming price sorting is broken
    const sortedLoHi = [...pricesAfterLoHi].sort((a, b) => a - b);
    expect(pricesAfterLoHi).not.toEqual(sortedLoHi);
  });

  test('problem_user checkout form: last name field input is misdirected to first name', async ({
    page,
    loginAs,
    inventoryPage,
    cartPage,
    checkoutPage,
  }) => {
    await annotate('problem_user', 'Checkout Form Bug', Severity.NORMAL);

    // 1. Login as problem_user, add backpack to cart, open cart
    await loginAs('problem');
    await inventoryPage.addToCart(PRODUCTS.backpack.id);
    await inventoryPage.openCart();

    // 2. Call cartPage.checkout() to reach /checkout-step-one.html
    await cartPage.checkout();

    // expect: URL matches /checkout-step-one\.html/
    await expect(page).toHaveURL(/checkout-step-one\.html/);

    // 3. Fill the first name field with CHECKOUT_INFO.firstName
    await checkoutPage.firstNameInput.fill(CHECKOUT_INFO.firstName);

    // 4. Attempt to fill the last name field with CHECKOUT_INFO.lastName
    //    (which actually updates firstName in DOM due to the bug)
    await checkoutPage.lastNameInput.fill(CHECKOUT_INFO.lastName);

    // 5. Evaluate the actual DOM values
    const firstNameValue = await checkoutPage.firstNameInput.inputValue();
    const lastNameValue = await checkoutPage.lastNameInput.inputValue();

    // expect: firstName contains CHECKOUT_INFO.lastName (text typed into lastNameInput was redirected)
    expect(firstNameValue).toBe(CHECKOUT_INFO.lastName);
    // expect: lastName is empty string — confirming the last name field is wired to update first name
    expect(lastNameValue).toBe('');

    // 6. Fill postal code and submit
    await checkoutPage.postalCodeInput.fill(CHECKOUT_INFO.postalCode);
    await checkoutPage.continue();

    // 7. Assert that checkoutPage.errorMessage has text 'Error: Last Name is required'
    // expect: The form cannot be submitted because the last name field is always empty for problem_user
    await expect(checkoutPage.errorMessage).toHaveText('Error: Last Name is required');
  });
});

test.describe('checkout field validation', () => {
  test('requires the last name', async ({ page, inventoryPage, cartPage, checkoutPage }) => {
    await annotate('Checkout', 'Last Name Required', Severity.NORMAL);

    // 1. Using shared storageState (standard_user), add backpack to cart and proceed to checkout
    await inventoryPage.goto();
    await inventoryPage.addToCart(PRODUCTS.backpack.id);
    await inventoryPage.openCart();
    await cartPage.checkout();

    // 2. Fill first name and postal code, leave last name empty
    await checkoutPage.fillInformation(CHECKOUT_INFO.firstName, '', CHECKOUT_INFO.postalCode);

    // 3. Call checkoutPage.continue()
    await checkoutPage.continue();

    // 4. Assert error message and URL
    // expect: The error message 'Error: Last Name is required' is visible on the page
    await expect(checkoutPage.errorMessage).toHaveText('Error: Last Name is required');
    // expect: The URL remains /checkout-step-one\.html/ — the form did not advance
    await expect(page).toHaveURL(/checkout-step-one\.html/);
  });

  test('requires the postal code', async ({ page, inventoryPage, cartPage, checkoutPage }) => {
    await annotate('Checkout', 'Postal Code Required', Severity.NORMAL);

    // 1. Using shared storageState (standard_user), add backpack to cart and proceed to checkout
    await inventoryPage.goto();
    await inventoryPage.addToCart(PRODUCTS.backpack.id);
    await inventoryPage.openCart();
    await cartPage.checkout();

    // 2. Fill first name and last name, leave postal code empty
    await checkoutPage.fillInformation(CHECKOUT_INFO.firstName, CHECKOUT_INFO.lastName, '');

    // 3. Call checkoutPage.continue()
    await checkoutPage.continue();

    // 4. Assert error message and URL
    // expect: The error message 'Error: Postal Code is required' is visible on the page
    await expect(checkoutPage.errorMessage).toHaveText('Error: Postal Code is required');
    // expect: The URL remains /checkout-step-one\.html/ — the form did not advance
    await expect(page).toHaveURL(/checkout-step-one\.html/);
  });

  test('error banner can be dismissed with the X button', async ({
    page,
    inventoryPage,
    cartPage,
    checkoutPage,
  }) => {
    await annotate('Checkout', 'Error Banner Dismiss', Severity.NORMAL);

    // 1. Using shared storageState (standard_user), add backpack to cart and proceed to checkout
    await inventoryPage.goto();
    await inventoryPage.addToCart(PRODUCTS.backpack.id);
    await inventoryPage.openCart();
    await cartPage.checkout();

    // 2. Leave all fields empty and submit
    await checkoutPage.fillInformation('', '', '');
    await checkoutPage.continue();

    // 3. Assert that checkoutPage.errorMessage is visible
    // expect: An error message is shown (First Name is required)
    await expect(checkoutPage.errorMessage).toBeVisible();

    // 4. Click the dismiss button via page.getByTestId('error-button')
    await page.getByTestId('error-button').click();

    // 5. Assert that checkoutPage.errorMessage is not visible
    // expect: The error banner is gone — no error element with data-test="error" is visible
    await expect(checkoutPage.errorMessage).not.toBeVisible();
  });
});

test.describe('product detail page content', () => {
  test('detail page shows name, description, price, and Add to Cart for a product not in the cart', async ({
    page,
    inventoryPage,
  }) => {
    await annotate('Product Detail', 'Detail Page Content', Severity.NORMAL);

    // 1. Using the shared storageState (standard_user), navigate to inventory
    await inventoryPage.goto();

    // 2. Call inventoryPage.openProduct(PRODUCTS.backpack.name) to click the product title link
    await inventoryPage.openProduct(PRODUCTS.backpack.name);

    // expect: URL matches /inventory-item\.html/
    await expect(page).toHaveURL(/inventory-item\.html/);

    // 3. Assert product name is correct
    // expect: The product name heading is visible and correct
    await expect(page.getByTestId('inventory-item-name')).toHaveText(PRODUCTS.backpack.name);

    // 4. Assert product description is visible and non-empty
    // expect: The product description paragraph is present and not blank
    await expect(page.getByTestId('inventory-item-desc')).toBeVisible();
    const descText = await page.getByTestId('inventory-item-desc').textContent();
    expect(descText?.trim().length).toBeGreaterThan(0);

    // 5. Assert price is displayed correctly
    // expect: The price is displayed correctly
    await expect(page.getByTestId('inventory-item-price')).toHaveText(
      `$${PRODUCTS.backpack.price}`,
    );

    // 6. Assert 'Add to cart' button is present (item not in cart)
    // expect: The 'Add to cart' button is present on the detail page because the item is not in the cart
    await expect(page.getByTestId('add-to-cart')).toBeVisible();
  });

  test('detail page Add to Cart button adds the item and flips to Remove', async ({
    page,
    inventoryPage,
  }) => {
    await annotate('Product Detail', 'Add to Cart Button Flip', Severity.NORMAL);

    // 1. Navigate to bike light detail page
    await inventoryPage.goto();
    await inventoryPage.openProduct(PRODUCTS.bikeLight.name);

    // expect: URL matches /inventory-item\.html/
    await expect(page).toHaveURL(/inventory-item\.html/);

    // 2. Assert that the cart badge is not present (cart is empty at start)
    // expect: No cart badge is shown, confirming an empty cart
    await expect(inventoryPage.cartBadge).not.toBeVisible();

    // 3. Click page.getByTestId('add-to-cart')
    await page.getByTestId('add-to-cart').click();

    // 4. Assert that shopping-cart-badge has text '1'
    // expect: Cart badge increments to 1, confirming the item was added from the detail page
    await expect(page.getByTestId('shopping-cart-badge')).toHaveText('1');

    // 5. Assert button flipped from 'Add to cart' to 'Remove'
    // expect: The button has flipped from 'Add to cart' to 'Remove', confirming state toggle
    await expect(page.getByTestId('remove')).toBeVisible();
    await expect(page.getByTestId('add-to-cart')).not.toBeVisible();
  });

  test('Back to products button returns to the inventory listing', async ({
    page,
    inventoryPage,
  }) => {
    await annotate('Product Detail', 'Back to Products Navigation', Severity.NORMAL);

    // 1. Navigate to backpack detail page
    await inventoryPage.goto();
    await inventoryPage.openProduct(PRODUCTS.backpack.name);

    // expect: URL matches /inventory-item\.html/
    await expect(page).toHaveURL(/inventory-item\.html/);

    // 2. Click page.getByTestId('back-to-products')
    await page.getByTestId('back-to-products').click();

    // 3. Assert that the URL matches /inventory\.html/
    // expect: The user is returned to the inventory listing page
    await expect(page).toHaveURL(/inventory\.html/);

    // 4. Assert that inventory-item has count 6
    // expect: The full catalog is visible, confirming a complete and correct return to the inventory
    await expect(page.getByTestId('inventory-item')).toHaveCount(6);
  });
});
