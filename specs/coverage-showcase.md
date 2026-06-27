# Coverage Showcase Test Plan

## Application Overview

Spec file: tests/ui/coverage-showcase.spec.ts

This plan covers three documented gaps in the saucedemo.com E2E suite:

1. problem_user account — login as problem_user (password: secret_sauce) and verify the known defects: all product images render the shared sl-404 placeholder instead of product-specific images; all sort options (Z→A, low→high, high→low) leave the listing in its original A→Z order; clicking "Add to Cart" for items beyond the ones already in-cart state has no effect (cart count does not change, button does not flip to "Remove"); and the checkout step-one form's last-name field is wired incorrectly — input typed there updates the firstName field instead, so lastName is always empty and form submission always fails with "Error: Last Name is required".

2. Checkout field validation — currently only missing first name is covered. Two additional cases are needed: submitting the form with first name filled but last name empty produces "Error: Last Name is required"; and submitting with first name and last name filled but postal code empty produces "Error: Postal Code is required".

3. Product detail page content — navigating from the inventory list to a product's detail page (/inventory-item.html?id=N) must show the product name (data-test="inventory-item-name"), description (data-test="inventory-item-desc"), price (data-test="inventory-item-price"), and an "Add to cart" button (data-test="add-to-cart"). The "Back to products" button (data-test="back-to-products") must return the user to the inventory listing.

Conventions:
- testIdAttribute is data-test; all locators use getByTestId().
- Import test, expect, USERS from ../../src/fixtures/test.js.
- Import PRODUCTS, CHECKOUT_INFO from ../../src/data/users.js.
- Page-object fixtures available: loginPage, inventoryPage, cartPage, checkoutPage.
- Tests needing problem_user call loginAs('problem') inside the test body and declare test.use({ storageState: { cookies: [], origins: [] } }) at the describe block level.
- Tests using standard_user rely on the shared storageState (no loginAs call needed).
- The describe block for problem_user tests must include test.use({ storageState: { cookies: [], origins: [] } }).

## Test Scenarios

### 1. problem_user account

**Seed:** `tests/seed.spec.ts`

#### 1.1. problem_user can log in and reaches the inventory

**File:** `tests/ui/coverage-showcase.spec.ts`

**Steps:**
  1. Declare test.use({ storageState: { cookies: [], origins: [] } }) at the describe block level so no shared auth is loaded.
  2. Call loginAs('problem') to navigate to the login page and authenticate as problem_user / secret_sauce.
    - expect: The page URL should match /inventory\.html/
    - expect: The Products heading should be visible via getByTestId('product-sort-container') or page.getByText('Products', { exact: true })
  3. Assert that getByTestId('inventory-item') has count 6.
    - expect: All six catalog items are displayed

#### 1.2. problem_user inventory shows broken images (sl-404 placeholder for all products)

**File:** `tests/ui/coverage-showcase.spec.ts`

**Steps:**
  1. After loginAs('problem') and inventoryPage.goto(), evaluate document.querySelectorAll('[data-test^="item-"][data-test$="-img"]') to collect each product image element's src attribute.
  2. Assert that every collected src value includes 'sl-404' (i.e. the shared error-placeholder filename).
    - expect: All six product image elements point to the same sl-404 placeholder path, confirming broken images for problem_user

#### 1.3. problem_user sorting does not reorder the inventory list

**File:** `tests/ui/coverage-showcase.spec.ts`

**Steps:**
  1. After loginAs('problem') and inventoryPage.goto(), call inventoryPage.sortBy('za') to select Name (Z to A).
  2. Collect product names via inventoryPage.productNames().
    - expect: The returned array is NOT in Z-to-A descending order — it matches the original A-to-Z order, confirming the sort is broken
  3. Call inventoryPage.sortBy('lohi') to select Price (low to high).
  4. Collect product prices via inventoryPage.productPrices().
    - expect: The returned array is NOT sorted ascending — prices are in their original unsorted order, confirming price sorting is also broken for problem_user

#### 1.4. problem_user checkout form: last name field input is misdirected to first name

**File:** `tests/ui/coverage-showcase.spec.ts`

**Steps:**
  1. After loginAs('problem'), navigate to inventory, add PRODUCTS.backpack to cart via inventoryPage.addToCart(PRODUCTS.backpack.id), then openCart().
  2. Call cartPage.checkout() to reach /checkout-step-one.html.
    - expect: URL matches /checkout-step-one\.html/
  3. Fill the first name field with CHECKOUT_INFO.firstName using checkoutPage.firstNameInput.fill(CHECKOUT_INFO.firstName).
  4. Attempt to fill the last name field with CHECKOUT_INFO.lastName using checkoutPage.lastNameInput.fill(CHECKOUT_INFO.lastName).
  5. Evaluate the actual DOM values: document.querySelector('[data-test="firstName"]').value and document.querySelector('[data-test="lastName"]').value.
    - expect: firstName contains CHECKOUT_INFO.lastName (the text typed into lastNameInput was redirected to firstName)
    - expect: lastName is empty string — confirming the last name field is wired to update first name instead
  6. Fill the postal code field with CHECKOUT_INFO.postalCode via checkoutPage.postalCodeInput.fill(CHECKOUT_INFO.postalCode), then call checkoutPage.continue().
  7. Assert that checkoutPage.errorMessage has text 'Error: Last Name is required'.
    - expect: The form cannot be submitted because the last name field is always empty for problem_user — checkout is effectively blocked

### 2. Checkout field validation

**Seed:** `tests/seed.spec.ts`

#### 2.1. requires the last name

**File:** `tests/ui/coverage-showcase.spec.ts`

**Steps:**
  1. Using the shared storageState (standard_user), navigate to inventoryPage.goto(), add PRODUCTS.backpack to cart, openCart(), then call cartPage.checkout() to reach /checkout-step-one.html.
  2. Call checkoutPage.fillInformation(CHECKOUT_INFO.firstName, '', CHECKOUT_INFO.postalCode) — first name and postal code filled, last name left empty.
  3. Call checkoutPage.continue().
  4. Assert checkoutPage.errorMessage has text 'Error: Last Name is required'.
    - expect: The error message 'Error: Last Name is required' is visible on the page
    - expect: The URL remains /checkout-step-one\.html/ — the form did not advance to step two

#### 2.2. requires the postal code

**File:** `tests/ui/coverage-showcase.spec.ts`

**Steps:**
  1. Using the shared storageState (standard_user), navigate to inventoryPage.goto(), add PRODUCTS.backpack to cart, openCart(), then call cartPage.checkout() to reach /checkout-step-one.html.
  2. Call checkoutPage.fillInformation(CHECKOUT_INFO.firstName, CHECKOUT_INFO.lastName, '') — first name and last name filled, postal code left empty.
  3. Call checkoutPage.continue().
  4. Assert checkoutPage.errorMessage has text 'Error: Postal Code is required'.
    - expect: The error message 'Error: Postal Code is required' is visible on the page
    - expect: The URL remains /checkout-step-one\.html/ — the form did not advance to step two

#### 2.3. error banner can be dismissed with the X button

**File:** `tests/ui/coverage-showcase.spec.ts`

**Steps:**
  1. Using the shared storageState (standard_user), navigate to inventoryPage.goto(), add PRODUCTS.backpack to cart, openCart(), then call cartPage.checkout().
  2. Call checkoutPage.fillInformation('', '', '') to leave all fields empty, then call checkoutPage.continue().
  3. Assert that checkoutPage.errorMessage is visible.
    - expect: An error message is shown (First Name is required)
  4. Click the dismiss button via page.getByTestId('error-button').click().
  5. Assert that checkoutPage.errorMessage is not visible (it has been removed from the DOM or hidden).
    - expect: The error banner is gone — no error element with data-test="error" is visible in the page

### 3. Product detail page content

**Seed:** `tests/seed.spec.ts`

#### 3.1. detail page shows name, description, price, and Add to Cart for a product not in the cart

**File:** `tests/ui/coverage-showcase.spec.ts`

**Steps:**
  1. Using the shared storageState (standard_user), call inventoryPage.goto().
  2. Call inventoryPage.openProduct(PRODUCTS.backpack.name) to click the product title link.
    - expect: URL matches /inventory-item\.html/
  3. Assert page.getByTestId('inventory-item-name') has text PRODUCTS.backpack.name ('Sauce Labs Backpack').
    - expect: The product name heading is visible and correct
  4. Assert page.getByTestId('inventory-item-desc') is visible and its text content is non-empty.
    - expect: The product description paragraph is present and not blank
  5. Assert page.getByTestId('inventory-item-price') has text '$29.99' (PRODUCTS.backpack.price formatted as currency).
    - expect: The price is displayed correctly
  6. Assert page.getByTestId('add-to-cart') is visible.
    - expect: The 'Add to cart' button is present on the detail page because the item is not in the cart

#### 3.2. detail page Add to Cart button adds the item and flips to Remove

**File:** `tests/ui/coverage-showcase.spec.ts`

**Steps:**
  1. Using the shared storageState (standard_user), call inventoryPage.goto(), then call inventoryPage.openProduct(PRODUCTS.bikeLight.name).
    - expect: URL matches /inventory-item\.html/
  2. Assert that the cart badge is not present (cart is empty at start — cartCount() returns 0).
    - expect: No cart badge is shown, confirming an empty cart
  3. Click page.getByTestId('add-to-cart').
  4. Assert that page.getByTestId('shopping-cart-badge') has text '1'.
    - expect: Cart badge increments to 1, confirming the item was added from the detail page
  5. Assert that page.getByTestId('remove') is visible and page.getByTestId('add-to-cart') is not visible.
    - expect: The button has flipped from 'Add to cart' to 'Remove', confirming state toggle on the detail page

#### 3.3. Back to products button returns to the inventory listing

**File:** `tests/ui/coverage-showcase.spec.ts`

**Steps:**
  1. Using the shared storageState (standard_user), call inventoryPage.goto(), then call inventoryPage.openProduct(PRODUCTS.backpack.name).
    - expect: URL matches /inventory-item\.html/
  2. Click page.getByTestId('back-to-products').
  3. Assert that the URL matches /inventory\.html/.
    - expect: The user is returned to the inventory listing page
  4. Assert that page.getByTestId('inventory-item') has count 6.
    - expect: The full catalog is visible, confirming a complete and correct return to the inventory
