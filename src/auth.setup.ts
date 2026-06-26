import { test as setup, expect } from '@playwright/test';
import { LoginPage } from './pages/index.js';
import { USERS } from './data/users.js';
import { STORAGE_STATE } from '../playwright.config.js';

/**
 * Setup "test" that logs in once as standard_user and persists the browser
 * storage state. Every authenticated project depends on this project and reuses
 * the state, so the bulk of the suite starts already logged in.
 */
setup('authenticate as standard_user', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(USERS.standard.username, USERS.standard.password);

  // Confirm we actually reached the inventory before saving state.
  await expect(page).toHaveURL(/inventory\.html/);
  await expect(page.getByText('Products', { exact: true })).toBeVisible();

  await page.context().storageState({ path: STORAGE_STATE });
});
