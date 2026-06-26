import { test, expect, USERS } from '../../src/fixtures/test.js';
import {
  BAD_CREDENTIALS_ERROR,
  LOCKED_OUT_ERROR,
  MISSING_PASSWORD_ERROR,
  MISSING_USERNAME_ERROR,
  PASSWORD,
} from '../../src/data/users.js';
import { annotate, Severity } from '../../src/utils/allure.js';

/**
 * Authentication. This file logs in fresh, so it opts OUT of the shared
 * storage state — otherwise we'd start already authenticated.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ loginPage }) => {
  await loginPage.goto();
});

test.describe('login', () => {
  test('standard_user reaches the inventory', { tag: '@smoke' }, async ({ loginPage, page }) => {
    await annotate('Login', 'Happy Path', Severity.BLOCKER);
    await loginPage.login(USERS.standard.username, USERS.standard.password);
    await expect(page).toHaveURL(/inventory\.html/);
    await expect(page.getByText('Products', { exact: true })).toBeVisible();
  });

  test('locked_out_user is blocked with an error', { tag: '@smoke' }, async ({ loginPage }) => {
    await annotate('Login', 'Locked Out User', Severity.CRITICAL);
    await loginPage.login(USERS.lockedOut.username, USERS.lockedOut.password);
    await expect(loginPage.errorMessage).toHaveText(LOCKED_OUT_ERROR);
  });

  test('wrong password is rejected', async ({ loginPage }) => {
    await annotate('Login', 'Invalid Credentials', Severity.CRITICAL);
    await loginPage.login(USERS.standard.username, 'wrong_password');
    await expect(loginPage.errorMessage).toHaveText(BAD_CREDENTIALS_ERROR);
  });

  test('missing username is rejected', async ({ loginPage }) => {
    await annotate('Login', 'Validation – Missing Username', Severity.NORMAL);
    await loginPage.login('', PASSWORD);
    await expect(loginPage.errorMessage).toHaveText(MISSING_USERNAME_ERROR);
  });

  test('missing password is rejected', async ({ loginPage }) => {
    await annotate('Login', 'Validation – Missing Password', Severity.NORMAL);
    await loginPage.login(USERS.standard.username, '');
    await expect(loginPage.errorMessage).toHaveText(MISSING_PASSWORD_ERROR);
  });

  /* Data-driven smoke check across every account that should be able to log in. */
  for (const account of Object.values(USERS).filter((u) => u.canLogin)) {
    test(`${account.username} can authenticate`, async ({ loginPage, page }) => {
      await annotate('Login', 'User Matrix', Severity.NORMAL);
      await loginPage.login(account.username, account.password);
      await expect(page).toHaveURL(/inventory\.html/);
    });
  }

  test('logout returns to the login screen', async ({ loginPage, inventoryPage, page }) => {
    await annotate('Login', 'Logout', Severity.CRITICAL);
    await loginPage.login(USERS.standard.username, USERS.standard.password);
    await inventoryPage.logout();
    await expect(page).toHaveURL(/(\/|index\.html)$/);
    await expect(loginPage.loginButton).toBeVisible();
  });
});
