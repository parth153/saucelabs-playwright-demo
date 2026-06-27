# Test Cases — saucedemo E2E Suite

Each row maps to a specific `test(...)` block in the codebase. **ID** is a stable reference for cross-linking; **Severity** is the Allure severity set in the spec; **Tags** are Playwright tags.

---

## Pillar 1 — UI / Login (`tests/ui/login.spec.ts`)

_Precondition for all:_ fresh unauthenticated context (`storageState: { cookies: [], origins: [] }`), login page loaded at `/`.

| ID | Test Name | Severity | Tags | Steps | Expected Result |
|----|-----------|----------|------|-------|-----------------|
| UI-L-01 | standard_user reaches the inventory | BLOCKER | @smoke | 1. Enter `standard_user` / `secret_sauce`. 2. Click Login. | URL matches `/inventory.html`; "Products" heading visible. |
| UI-L-02 | locked_out_user is blocked with an error | CRITICAL | @smoke | 1. Enter `locked_out_user` / `secret_sauce`. 2. Click Login. | Error banner: "Epic sadface: Sorry, this user has been locked out." |
| UI-L-03 | wrong password is rejected | CRITICAL | — | 1. Enter `standard_user` / `wrong_password`. 2. Click Login. | Error banner: "Epic sadface: Username and password do not match any user in this service" |
| UI-L-04 | missing username is rejected | NORMAL | — | 1. Leave username blank. 2. Enter `secret_sauce`. 3. Click Login. | Error banner: "Epic sadface: Username is required" |
| UI-L-05 | missing password is rejected | NORMAL | — | 1. Enter `standard_user`. 2. Leave password blank. 3. Click Login. | Error banner: "Epic sadface: Password is required" |
| UI-L-06 | `<username>` can authenticate (×4 canLogin accounts) | NORMAL | — | 1. Enter each `canLogin` account. 2. Click Login. | URL matches `/inventory.html` for each account (data-driven). |
| UI-L-07 | logout returns to the login screen | CRITICAL | — | 1. Login as `standard_user`. 2. Open burger menu. 3. Click Logout. | URL matches `/` or `/index.html`; Login button visible. |

---

## Pillar 1 — UI / Inventory (`tests/ui/inventory.spec.ts`)

_Precondition for all:_ authenticated as `standard_user` via shared storage state; inventory page loaded at `/inventory.html`.

| ID | Test Name | Severity | Tags | Steps | Expected Result |
|----|-----------|----------|------|-------|-----------------|
| UI-I-01 | shows the full catalog | BLOCKER | @smoke | 1. Navigate to inventory. | Exactly 6 `[data-test="inventory-item"]` elements visible. |
| UI-I-02 | sorts by name A→Z and Z→A | NORMAL | — | 1. Select "Name (A to Z)". 2. Read names. 3. Select "Name (Z to A)". 4. Read names. | Names match `.sort()` ascending, then descending. |
| UI-I-03 | sorts by price low→high and high→low | NORMAL | — | 1. Select "Price (low to high)". 2. Read prices. 3. Select "Price (high to low)". 4. Read prices. | Prices are in ascending then descending numeric order. |
| UI-I-04 | add then remove updates the cart badge | CRITICAL | @smoke | 1. Add backpack → badge shows "1". 2. Add bike light → badge shows "2". 3. Remove backpack → badge shows "1". 4. Verify Add button reappears for backpack. | Cart badge reflects add/remove state accurately. |
| UI-I-05 | opens a product detail page | NORMAL | — | 1. Click the backpack product name/image. | URL matches `/inventory-item.html`; product name text = "Sauce Labs Backpack". |

---

## Pillar 1 — UI / Cart (`tests/ui/cart.spec.ts`)

_Precondition for all:_ authenticated via shared storage state.

| ID | Test Name | Severity | Tags | Steps | Expected Result |
|----|-----------|----------|------|-------|-----------------|
| UI-C-01 | reflects items added from the inventory | CRITICAL | @smoke | 1. Add backpack. 2. Add bolt T-shirt. 3. Open cart. | Cart shows 2 items; names include both product names. |
| UI-C-02 | removing an item updates the cart | CRITICAL | — | 1. Add backpack + bike light. 2. Open cart. 3. Remove backpack. | Cart shows 1 item; only bike light remains. |
| UI-C-03 | continue shopping returns to the inventory | NORMAL | — | 1. Open cart (empty). 2. Click "Continue Shopping". | URL matches `/inventory.html`. |
| UI-C-04 | cart persists across a reload | NORMAL | — | 1. Add backpack. 2. Open cart. 3. Reload page. | Cart still shows 1 item after reload. |

---

## Pillar 1 — UI / Checkout (`tests/ui/checkout.spec.ts`)

_Precondition for all:_ authenticated via shared storage state; backpack + bike light added, cart opened, Checkout clicked.

| ID | Test Name | Severity | Tags | Steps | Expected Result |
|----|-----------|----------|------|-------|-----------------|
| UI-CH-01 | completes the happy path | BLOCKER | @smoke | 1. Fill first name "Ada", last name "Lovelace", postal "94016". 2. Continue. 3. Finish. | URL matches `/checkout-complete.html`; "Thank you for your order!" visible. |
| UI-CH-02 | item total, tax, and total are consistent | CRITICAL | — | 1. Fill checkout info. 2. Continue. 3. Read item total, tax, and grand total. | `itemTotal ≈ $39.98`; `tax ≈ itemTotal × 0.08`; `total ≈ itemTotal + tax`. |
| UI-CH-03 | requires the first name | NORMAL | — | 1. Leave first name blank. 2. Enter last name + postal. 3. Continue. | Error: "Error: First Name is required". |
| UI-CH-04 | cancel from information returns to the cart | NORMAL | — | 1. Click Cancel on step-one form. | URL matches `/cart.html`. |

---

## Pillar 2 — Visual Regression (`tests/visual/visual-regression.spec.ts`)

_Precondition:_ baselines exist for the current OS and project. Login page uses a clear-cookie context; all others use shared auth state.

_Runs across:_ chromium, firefox, webkit, mobile-chrome, mobile-safari, tablet (one baseline per project).

| ID | Test Name | Severity | Steps | Expected Result |
|----|-----------|----------|-------|-----------------|
| VR-01 | login page | NORMAL | 1. Clear cookies. 2. Navigate to `/`. | Full-page screenshot matches `login-<project>-<os>.png` within 2% pixel diff. |
| VR-02 | inventory page | NORMAL | 1. Navigate to inventory; wait for title. | Full-page screenshot matches `inventory-<project>-<os>.png`. |
| VR-03 | cart with items | NORMAL | 1. Add backpack + bike light. 2. Open cart. | Full-page screenshot matches `cart-<project>-<os>.png`. |
| VR-04 | checkout overview | NORMAL | 1. Add backpack, open cart, checkout, fill info, continue. | Full-page screenshot matches `checkout-overview-<project>-<os>.png`. |

---

## Pillar 3 — Network / XHR (`tests/network/xhr.spec.ts`)

_Precondition for all:_ authenticated via shared storage state unless noted.

| ID | Test Name | Severity | Tags | Steps | Expected Result |
|----|-----------|----------|------|-------|-----------------|
| NET-01 | inventory loads with no failed (4xx/5xx) responses | NORMAL | @smoke | 1. Listen for responses. 2. Navigate to inventory. | Zero sub-resource responses ≥ 400 (document responses excluded). _Skipped on Firefox._ |
| NET-02 | core JS/CSS assets are served with 200 + correct content-type | NORMAL | — | 1. Collect `.js`/`.css` responses while loading inventory. | All assets return HTTP 200 with `javascript` or `css` content-type. |
| NET-03 | blocking images leaves the app functional | NORMAL | — | 1. Install `route.abort()` for all image URLs. 2. Load inventory. | 6 items render; backpack can be added to cart; cart badge shows "1". |
| NET-04 | route.fulfill mocks a network response | NORMAL | — | 1. Install `route.fulfill()` replacing images with a 1×1 PNG. 2. Load inventory. | At least one image request fulfilled with `content-type: image/png`. |
| NET-05 | waitForResponse synchronizes on an asset request | NORMAL | — | 1. `Promise.all([waitForResponse(r => r.url().endsWith('.js')), loginPage.goto()])`. | JS response is `ok()` with `content-type: javascript`. |
| NET-06 | records and replays a HAR (offline mock pattern) | NORMAL | — | 1. Record inventory page to `inventory.har`. 2. Validate HAR has JS entries. 3. Replay with `routeFromHAR`. | HAR exists with >0 JS entries; replayed page loads and shows an inventory item. |

---

## Pillar 4 — Accessibility (`tests/a11y/accessibility.spec.ts`)

_Scan scope:_ WCAG 2.x (`wcag2a`, `wcag2aa`). Hard gate: new critical violations outside `KNOWN_CRITICAL`. Soft gate: total count surfaced as attachment.

| ID | Test Name | Severity | Tags | Steps | Expected Result |
|----|-----------|----------|------|-------|-----------------|
| A11Y-01 | login page | CRITICAL | @smoke | 1. Clear cookies. 2. Navigate to `/`. 3. Run axe. | No new critical violations outside `KNOWN_CRITICAL`; report attached. |
| A11Y-02 | inventory page | CRITICAL | — | 1. Navigate to inventory; wait for title. 2. Run axe. | No new critical violations; report attached. |
| A11Y-03 | cart page | CRITICAL | — | 1. Add backpack. 2. Open cart. 3. Run axe. | No new critical violations; report attached. |
| A11Y-04 | checkout information page | CRITICAL | — | 1. Add backpack → cart → checkout. 2. Run axe on step-one form. | No new critical violations; report attached. |
| A11Y-05 | checkout overview page | CRITICAL | — | 1. Complete checkout info, continue to overview. 2. Run axe. | No new critical violations; report attached. |
| A11Y-06 | the login form is operable by keyboard | CRITICAL | — | 1. Tab → username focused → type `standard_user`. 2. Tab → password focused → type `secret_sauce`. 3. Press Enter. | URL matches `/inventory.html` (keyboard-only flow succeeds). |

**Known critical violations allowlist:**

| Rule ID | Description |
|---------|-------------|
| `select-name` | Product-sort `<select>` has no accessible label. Pre-existing site defect. |

---

## Pillar 5 — Performance (`tests/performance/performance.spec.ts`)

_Precondition:_ authenticated via shared storage state. LCP and Lighthouse tests skip on non-Chromium projects.

| ID | Test Name | Severity | Engines | Steps | Expected Result |
|----|-----------|----------|---------|-------|-----------------|
| PERF-01 | inventory page meets navigation-timing budgets | NORMAL | All | 1. Navigate to inventory. 2. Read `performance.getEntriesByType('navigation')`. | TTFB < 3,000 ms; DOMContentLoaded < 6,000 ms; Load < 8,000 ms. |
| PERF-02 | largest contentful paint is within budget (Chromium) | NORMAL | Chromium only | 1. Navigate to inventory. 2. Read LCP via PerformanceObserver. | LCP > 0 and < 6,000 ms. |
| PERF-03 | performance_glitch_user is measurably slower (detection demo) | NORMAL | All | 1. Login as `performance_glitch_user`. 2. Time until "Products" heading visible. | Elapsed > 1,000 ms (intentional delay). |
| PERF-04 | inventory page passes Lighthouse category thresholds | NORMAL | Chromium only | 1. Launch Chrome on port 9222. 2. Run `playAudit` on `/inventory.html`. | performance ≥ 50, accessibility ≥ 50, best-practices ≥ 50, SEO ≥ 50. |

---

## Pillar 6 — Security (`tests/security/security.spec.ts`)

| ID | Test Name | Severity | Tags | Precondition | Steps | Expected Result |
|----|-----------|----------|------|--------------|-------|-----------------|
| SEC-01 | direct access to `/inventory.html` while logged out is denied | BLOCKER | @smoke | Unauthenticated | 1. `page.goto('/inventory.html')`. | URL matches `/` or `/index.html`; error message contains "you can only access". |
| SEC-02 | direct access to `/cart.html` while logged out is denied | BLOCKER | — | Unauthenticated | 1. `page.goto('/cart.html')`. | URL matches `/` or `/index.html`; error message contains "you can only access". |
| SEC-03 | direct access to `/checkout-step-one.html` while logged out is denied | BLOCKER | — | Unauthenticated | 1. `page.goto('/checkout-step-one.html')`. | URL matches `/` or `/index.html`; error message contains "you can only access". |
| SEC-04 | main document is served over HTTPS | CRITICAL | — | Authenticated | 1. `page.goto('/inventory.html')`. 2. Check response URL protocol. | `protocol === 'https:'`. |
| SEC-05 | security headers are audited (report-style) | NORMAL | — | Authenticated | 1. Navigate to inventory. 2. Audit response headers. | Audit JSON attached; soft assertions surface missing recommended headers without failing the build. |
| SEC-06 | session cookie attributes are inspected after login | CRITICAL | — | Authenticated | 1. Navigate to inventory. 2. Read `session-username` cookie. | Cookie exists; `HttpOnly`, `Secure`, `SameSite` flags are soft-asserted and attached as JSON. |

---

## Pillar 7 — Seed (`tests/seed.spec.ts`)

The seed spec documents conventions and serves as a health check that the environment is configured correctly. It must stay green in CI.

| ID | Test Name | Purpose |
|----|-----------|---------|
| SEED-01 | All assertions in `seed.spec.ts` | Validates that `baseURL`, `getByTestId`, credentials, fixtures, and the POM layer all work end-to-end. |

---

## Summary by Severity

| Severity | Count | IDs |
|----------|-------|-----|
| BLOCKER | 5 | UI-L-01, UI-CH-01, SEC-01, SEC-02, SEC-03 |
| CRITICAL | 17 | UI-L-02, UI-L-03, UI-L-07, UI-I-04, UI-C-01, UI-C-02, UI-CH-02, A11Y-01–A11Y-06, PERF-02, SEC-04, SEC-06 |
| NORMAL | 24 | All remaining |

## Tag Reference

| Tag | Meaning | Tests |
|-----|---------|-------|
| `@smoke` | Minimum viable check; run first to verify SUT is up | UI-L-01, UI-L-02, UI-I-01, UI-I-04, UI-C-01, UI-CH-01, A11Y-01, SEC-01, NET-01 |
