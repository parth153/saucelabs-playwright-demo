import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage.js';

/**
 * The cart at `/cart.html`: review items, remove them, or proceed to checkout.
 */
export class CartPage extends BasePage {
  readonly items: Locator;
  readonly itemNames: Locator;
  readonly checkoutButton: Locator;
  readonly continueShoppingButton: Locator;

  constructor(page: Page) {
    super(page);
    this.items = page.getByTestId('inventory-item');
    this.itemNames = page.getByTestId('inventory-item-name');
    this.checkoutButton = page.getByTestId('checkout');
    this.continueShoppingButton = page.getByTestId('continue-shopping');
  }

  async goto(): Promise<void> {
    await this.page.goto('/cart.html');
  }

  async itemNamesText(): Promise<string[]> {
    return this.itemNames.allTextContents();
  }

  async removeFromCart(productId: string): Promise<void> {
    await this.page.getByTestId(`remove-${productId}`).click();
  }

  async checkout(): Promise<void> {
    await this.checkoutButton.click();
  }

  async continueShopping(): Promise<void> {
    await this.continueShoppingButton.click();
  }
}
