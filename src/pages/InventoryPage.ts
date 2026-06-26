import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage.js';

export type SortOption = 'az' | 'za' | 'lohi' | 'hilo';

/**
 * The product listing at `/inventory.html`: catalog, sorting, and add/remove.
 */
export class InventoryPage extends BasePage {
  readonly title: Locator;
  readonly items: Locator;
  readonly itemNames: Locator;
  readonly itemPrices: Locator;
  readonly sortDropdown: Locator;

  constructor(page: Page) {
    super(page);
    this.title = page.getByText('Products', { exact: true });
    this.items = page.getByTestId('inventory-item');
    this.itemNames = page.getByTestId('inventory-item-name');
    this.itemPrices = page.getByTestId('inventory-item-price');
    this.sortDropdown = page.getByTestId('product-sort-container');
  }

  async goto(): Promise<void> {
    await this.page.goto('/inventory.html');
  }

  async count(): Promise<number> {
    return this.items.count();
  }

  async productNames(): Promise<string[]> {
    return this.itemNames.allTextContents();
  }

  /** Prices as numbers (strips the leading "$"). */
  async productPrices(): Promise<number[]> {
    const raw = await this.itemPrices.allTextContents();
    return raw.map((p) => Number.parseFloat(p.replace('$', '')));
  }

  async sortBy(option: SortOption): Promise<void> {
    await this.sortDropdown.selectOption(option);
  }

  addToCartButton(productId: string): Locator {
    return this.page.getByTestId(`add-to-cart-${productId}`);
  }

  removeButton(productId: string): Locator {
    return this.page.getByTestId(`remove-${productId}`);
  }

  async addToCart(productId: string): Promise<void> {
    await this.addToCartButton(productId).click();
  }

  async removeFromCart(productId: string): Promise<void> {
    await this.removeButton(productId).click();
  }

  /** Open a product's detail page by clicking its title. */
  async openProduct(name: string): Promise<void> {
    await this.page.getByTestId('inventory-item-name').filter({ hasText: name }).click();
  }
}
