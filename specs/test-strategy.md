# Test Strategy — saucedemo E2E Suite

## 1. Context

**System under test:** [https://www.saucedemo.com](https://www.saucedemo.com) — a publicly hosted demo e-commerce SPA maintained by Sauce Labs.

**Nature of the SUT:** There is no application source in this repository. The suite exercises the live remote site. This shapes every decision below: tests must be read-only/non-invasive, there is no database to reset, and network reliability is an environmental variable we can only tolerate, not control.

---

## 2. Objectives

| Priority | Objective |
|----------|-----------|
| P0 | Verify the core user journey — login → browse → cart → checkout — is unbroken. |
| P1 | Detect regressions in visual layout across desktop, mobile, and tablet viewports. |
| P1 | Catch new accessibility violations before they accumulate. |
| P2 | Confirm security posture: protected routes enforce authentication, cookies carry hardening flags, transport is HTTPS. |
| P2 | Validate network behaviour: assets load, SPA routing synchronizes correctly, mocking/HAR techniques work as documented. |
| P3 | Keep performance budgets as a canary, not a gate (public internet variance is high). |

---

## 3. Test Pillars

The suite is organized into seven pillars, each a separate directory under `tests/`:

| Pillar | File(s) | Purpose |
|--------|---------|---------|
| **UI / Functional** | `tests/ui/` | End-to-end user flows (login, inventory, cart, checkout). |
| **Visual Regression** | `tests/visual/` | Pixel-level screenshot diffing per browser + device + OS. |
| **Network / XHR** | `tests/network/` | Response validation, resource blocking, route mocking, HAR record/replay. |
| **Accessibility** | `tests/a11y/` | axe-core WCAG 2.x scans + keyboard-navigation smoke. |
| **Performance** | `tests/performance/` | Navigation Timing, LCP (Chromium), Lighthouse audit (Chromium). |
| **Security** | `tests/security/` | Access-control enforcement, HTTPS, security headers, session-cookie flags. |
| **Seed** | `tests/seed.spec.ts` | Self-documenting spec that exercises conventions and keeps the environment green. |

---

## 4. Tooling Choices

| Tool | Role | Why |
|------|------|-----|
| **Playwright** | Test runner, browser automation | Cross-browser, device emulation, built-in network interception, storage-state auth. |
| **TypeScript** | Language | Type-safe fixtures, data objects, and page methods catch mistakes at compile time. |
| **Allure** | Reporting | Rich attachments (HTML a11y reports, JSON, screenshots, traces) and Severity tagging. |
| **axe-core / `@axe-core/playwright`** | Accessibility scanning | Industry-standard WCAG rule engine; integrates with Playwright page objects. |
| **playwright-lighthouse** | Lighthouse audits | Drives a real Chromium instance on a remote-debugging port; Chromium-only. |
| **axe-html-reporter** | A11y report rendering | Produces a human-readable HTML violations table attached to each Allure run. |

---

## 5. Authentication Strategy

A dedicated `setup` project (`src/auth.setup.ts`) logs in once as `standard_user` and writes browser state to `.auth/standard_user.json`. Every other project declares `dependencies: ['setup']` and loads that file, meaning **the bulk of the suite starts already authenticated** — no repeated login round-trips, fewer failure modes.

Specs that must run unauthenticated explicitly opt out:

```ts
test.use({ storageState: { cookies: [], origins: [] } });
```

Files that do this: `login.spec.ts`, parts of `accessibility.spec.ts` (keyboard-nav), `security.spec.ts` (access-control group).

---

## 6. Locator and Data Strategy

**Locators:** `playwright.config.ts` sets `testIdAttribute: 'data-test'`, so `getByTestId('foo')` directly maps onto saucedemo's own `data-test` attributes. Prefer test IDs over CSS selectors or text matchers wherever an attribute is available.

**Test data:** All accounts, products, error strings, tax rate, and checkout details are centralized in `src/data/users.ts`. Tests import from there — no hardcoded strings in spec files.

**Page Object Model:** `src/pages/` contains `LoginPage`, `InventoryPage`, `CartPage`, `CheckoutPage`, all extending `BasePage` (shared header — cart badge, burger-menu logout). Specs call intent-level methods, not raw Playwright API calls.

**Fixtures:** `src/fixtures/test.ts` re-exports `test` and `expect` with injected page objects (`loginPage`, `inventoryPage`, `cartPage`, `checkoutPage`) and a `loginAs(userKey)` helper. All specs import from there.

---

## 7. Cross-Browser and Device Matrix

| Project name | Engine / Device | Always runs? |
|---|---|---|
| `chromium` | Desktop Chrome (bundled) | Yes |
| `firefox` | Desktop Firefox (bundled) | Yes |
| `webkit` | Desktop Safari (bundled) | Yes |
| `mobile-chrome` | Pixel 5 (Chromium emulation) | Yes |
| `mobile-safari` | iPhone 13 (WebKit emulation) | Yes |
| `tablet` | iPad Pro 11 (WebKit emulation) | Yes |
| `edge` | Real Microsoft Edge | Opt-in (`INCLUDE_BRANDED=1`) |
| `google-chrome` | Real Google Chrome | Opt-in (`INCLUDE_BRANDED=1`) |

---

## 8. Visual Regression Approach

- Baseline PNG files live under `tests/visual/*-snapshots/`, namespaced `<name>-<project>-<os>.png`.
- Baselines are **OS-specific** — macOS baselines are committed for local development; Linux baselines are generated inside the official Playwright Docker container and committed for CI.
- Diff tolerance: `maxDiffPixelRatio: 0.02` (2 % of pixels may differ), animations disabled at snapshot time.
- To regenerate: `npm run update-snapshots`.

---

## 9. Accessibility Gating Model

The SUT has known pre-existing violations (e.g. `select-name` — the unlabelled sort `<select>`). The strategy gates on **regressions** rather than the total count:

- Every scan attaches an HTML report and raw JSON to the Allure run.
- A soft assertion surfaces the total violation count without failing the build.
- A hard assertion fails the build only if a **new critical** violation is found that is not in the `KNOWN_CRITICAL` allowlist in `tests/a11y/accessibility.spec.ts`.
- Adding to the allowlist is a deliberate, commented-out decision, not a workaround.

---

## 10. Performance Gating Model

Budgets are intentionally lenient (measured over the public internet):

| Metric | Budget | Notes |
|---|---|---|
| TTFB | < 3,000 ms | Navigation Timing API, all engines |
| DOMContentLoaded | < 6,000 ms | Navigation Timing API, all engines |
| Load | < 8,000 ms | Navigation Timing API, all engines |
| LCP | < 6,000 ms | PerformanceObserver, Chromium only |
| Lighthouse performance | ≥ 50 | Chromium only, 120 s timeout |
| Lighthouse accessibility | ≥ 50 | Chromium only |
| Lighthouse best-practices | ≥ 50 | Chromium only |
| Lighthouse SEO | ≥ 50 | Chromium only |

---

## 11. Security Testing Scope

**In scope (read-only / non-invasive):**
- Access control: protected routes bounce to login when unauthenticated.
- Transport: document is served over HTTPS.
- Response headers: audit presence of recommended security headers (report-style via soft assertions).
- Session cookie: inspect `session-username` cookie for `HttpOnly`, `Secure`, and `SameSite` flags (soft assertions; saucedemo sets a permissive cookie).

**Out of scope:**
- Any form of active attack, fuzzing, injection, load testing, or credential brute-forcing. The SUT is a shared public demo — invasive testing would affect other users.

---

## 12. SPA-Specific Quirks

saucedemo is a **client-routed SPA** with two documented gotchas that affect test design:

1. **No document request after login.** Navigating to `/inventory.html` from inside the SPA does not trigger a new HTML document fetch. Synchronize on asset responses (`.js` files) rather than document navigations when using `waitForResponse`.

2. **Static host returns HTTP 404 for direct `.html` document requests.** The app shell still renders, but a "no failed responses" network check must exclude `resourceType() === 'document'` to avoid false failures. Firefox also eagerly fetches PWA icon references that return 404 — the network test skips Firefox for this reason.

---

## 13. Known Gaps and Out-of-Scope Items

| Gap | Reason |
|---|---|
| `problem_user` / `error_user` / `visual_user` coverage | These accounts expose intentional defects; no specs exercise them yet. |
| Product detail page deep-links | Only navigation is tested; the detail page content is not fully covered. |
| Checkout step validation (last name / postal code required) | Only the first-name missing case is covered. |
| Mobile keyboard navigation | Keyboard-nav test runs desktop only (no touch/keyboard simulation for mobile). |
| Allure environment variables (CI) | `INCLUDE_BRANDED=1`, `PASSWORD`, `BASE_URL` override not exercised in the base suite. |
