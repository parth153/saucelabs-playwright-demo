import type { Locator, Page } from '@playwright/test';

/**
 * Shared behavior for every authenticated saucedemo page: the burger menu,
 * logout, and the shopping-cart badge/link that live in the header.
 */
export abstract class BasePage {
  readonly page: Page;
  readonly burgerMenuButton: Locator;
  readonly logoutLink: Locator;
  readonly cartLink: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.burgerMenuButton = page.getByRole('button', { name: 'Open Menu' });
    this.logoutLink = page.getByTestId('logout-sidebar-link');
    this.cartLink = page.getByTestId('shopping-cart-link');
    this.cartBadge = page.getByTestId('shopping-cart-badge');
  }

  /** Number of items currently shown on the cart badge (0 when hidden). */
  async cartCount(): Promise<number> {
    if ((await this.cartBadge.count()) === 0) return 0;
    const text = (await this.cartBadge.textContent())?.trim() ?? '0';
    return Number.parseInt(text, 10) || 0;
  }

  async openCart(): Promise<void> {
    await this.cartLink.click();
  }

  async logout(): Promise<void> {
    await this.burgerMenuButton.click();
    await this.logoutLink.click();
  }
}
