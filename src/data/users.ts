/**
 * Test data for saucedemo.com — accounts, products, and checkout details.
 *
 * All standard accounts share the same password. Each account exercises a
 * different behavior of the demo app:
 *  - standard_user           → the happy path
 *  - locked_out_user         → blocked at login with an error
 *  - problem_user            → broken product images / form glitches
 *  - performance_glitch_user → artificially slow page loads
 *  - error_user / visual_user→ injected functional / visual defects
 */

export const PASSWORD = process.env.PASSWORD ?? 'secret_sauce';

export interface UserAccount {
  username: string;
  password: string;
  /** Whether a successful login is expected for this account. */
  canLogin: boolean;
  /** Human-readable note about the account's quirk. */
  note: string;
}

export const USERS = {
  standard: {
    username: process.env.STANDARD_USER ?? 'standard_user',
    password: PASSWORD,
    canLogin: true,
    note: 'Baseline happy-path user.',
  },
  lockedOut: {
    username: 'locked_out_user',
    password: PASSWORD,
    canLogin: false,
    note: 'Login is blocked with a "locked out" error.',
  },
  problem: {
    username: 'problem_user',
    password: PASSWORD,
    canLogin: true,
    note: 'Broken product images and form-field glitches.',
  },
  performanceGlitch: {
    username: 'performance_glitch_user',
    password: PASSWORD,
    canLogin: true,
    note: 'Pages load with a deliberate delay.',
  },
  error: {
    username: 'error_user',
    password: PASSWORD,
    canLogin: true,
    note: 'Injected functional errors (e.g. sorting / checkout).',
  },
  visual: {
    username: 'visual_user',
    password: PASSWORD,
    canLogin: true,
    note: 'Injected visual defects for visual-regression demos.',
  },
} satisfies Record<string, UserAccount>;

export type UserKey = keyof typeof USERS;

/** The expected error shown when `locked_out_user` attempts to log in. */
export const LOCKED_OUT_ERROR = 'Epic sadface: Sorry, this user has been locked out.';

/** Error shown when credentials are missing. */
export const MISSING_USERNAME_ERROR = 'Epic sadface: Username is required';
export const MISSING_PASSWORD_ERROR = 'Epic sadface: Password is required';
export const BAD_CREDENTIALS_ERROR =
  'Epic sadface: Username and password do not match any user in this service';

/** A stable, well-known product used across cart/checkout specs. */
export const PRODUCTS = {
  backpack: {
    id: 'sauce-labs-backpack',
    name: 'Sauce Labs Backpack',
    price: 29.99,
  },
  bikeLight: {
    id: 'sauce-labs-bike-light',
    name: 'Sauce Labs Bike Light',
    price: 9.99,
  },
  boltTShirt: {
    id: 'sauce-labs-bolt-t-shirt',
    name: 'Sauce Labs Bolt T-Shirt',
    price: 15.99,
  },
} as const;

export type ProductKey = keyof typeof PRODUCTS;

/** The full catalog is six items. */
export const EXPECTED_PRODUCT_COUNT = 6;

/** Sauce Labs applies an 8% sales tax in the checkout overview. */
export const TAX_RATE = 0.08;

/** Default checkout customer details. */
export const CHECKOUT_INFO = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  postalCode: '94016',
} as const;
