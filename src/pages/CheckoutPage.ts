import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage.js';

/**
 * The three-step checkout flow:
 *   1. `/checkout-step-one.html`  → customer information form
 *   2. `/checkout-step-two.html`  → order overview with item total / tax / total
 *   3. `/checkout-complete.html`  → confirmation
 */
export class CheckoutPage extends BasePage {
  // Step one — information form
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly postalCodeInput: Locator;
  readonly continueButton: Locator;
  readonly cancelButton: Locator;
  readonly errorMessage: Locator;

  // Step two — overview
  readonly itemTotalLabel: Locator;
  readonly taxLabel: Locator;
  readonly totalLabel: Locator;
  readonly finishButton: Locator;

  // Step three — complete
  readonly completeHeader: Locator;

  constructor(page: Page) {
    super(page);
    this.firstNameInput = page.getByTestId('firstName');
    this.lastNameInput = page.getByTestId('lastName');
    this.postalCodeInput = page.getByTestId('postalCode');
    this.continueButton = page.getByTestId('continue');
    this.cancelButton = page.getByTestId('cancel');
    this.errorMessage = page.getByTestId('error');

    this.itemTotalLabel = page.getByTestId('subtotal-label');
    this.taxLabel = page.getByTestId('tax-label');
    this.totalLabel = page.getByTestId('total-label');
    this.finishButton = page.getByTestId('finish');

    this.completeHeader = page.getByTestId('complete-header');
  }

  async fillInformation(firstName: string, lastName: string, postalCode: string): Promise<void> {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.postalCodeInput.fill(postalCode);
  }

  async continue(): Promise<void> {
    await this.continueButton.click();
  }

  async finish(): Promise<void> {
    await this.finishButton.click();
  }

  /** Parse a `$NN.NN` label into a number. */
  private async amount(label: Locator): Promise<number> {
    const text = (await label.textContent()) ?? '';
    const match = text.match(/\$([\d.]+)/);
    return match ? Number.parseFloat(match[1]) : Number.NaN;
  }

  async itemTotal(): Promise<number> {
    return this.amount(this.itemTotalLabel);
  }

  async tax(): Promise<number> {
    return this.amount(this.taxLabel);
  }

  async total(): Promise<number> {
    return this.amount(this.totalLabel);
  }

  async errorText(): Promise<string> {
    return (await this.errorMessage.textContent())?.trim() ?? '';
  }
}
