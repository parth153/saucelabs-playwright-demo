import { test as base } from '@playwright/test';
import { CartPage, CheckoutPage, InventoryPage, LoginPage } from '../pages/index.js';
import { PASSWORD, USERS, type UserKey } from '../data/users.js';

/**
 * Extended `test` that injects a page object per fixture plus a `loginAs`
 * helper. Import this `test`/`expect` instead of `@playwright/test` in specs.
 */
type Fixtures = {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  /**
   * Logs in fresh as the given account (bypassing any stored auth) and lands on
   * the inventory page. Used by specs that need a specific non-standard user.
   */
  loginAs: (user: UserKey) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  loginAs: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(async (user: UserKey) => {
      const account = USERS[user];
      await loginPage.goto();
      await loginPage.login(account.username, account.password);
    });
  },
});

export { expect } from '@playwright/test';
export { USERS, PASSWORD };
