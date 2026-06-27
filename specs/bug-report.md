# Bug Report — saucedemo.com E2E Suite

**Date:** 2026-06-27
**Suite version:** commit `1347a83` + coverage-showcase additions
**Test run scope:** Chromium, Firefox, WebKit, mobile-chrome (Pixel 5), mobile-safari (iPhone 13)
**Total tests executed:** 61 (plus 1 skipped)
**Hard failures:** 0
**Tests with soft-assertion findings:** 2 (security headers, session cookie)
**Skipped:** 1 (Firefox network — known site gap)

---

## Summary Table

| ID | Pillar | Title | Severity | Status |
|----|--------|-------|----------|--------|
| BUG-UI-01 | UI | `problem_user` — all product images replaced with `sl-404` placeholder | High | Open (intentional defect account) |
| BUG-UI-02 | UI | `problem_user` — inventory sorting has no effect (list stays A→Z) | High | Open (intentional defect account) |
| BUG-UI-03 | UI | `problem_user` — checkout last-name input is wired to first-name field | Critical | Open (intentional defect account) |
| BUG-UI-04 | UI | `problem_user` — checkout is permanently blocked (last name always empty) | Critical | Open (intentional defect account) |
| BUG-VIS-01 | Visual | Baselines are OS-specific; macOS baselines fail on Linux CI without regeneration | Medium | Known / documented |
| BUG-NET-01 | Network | Static host returns HTTP 404 for direct `.html` document navigation | Medium | Known / documented |
| BUG-NET-02 | Network | Firefox: PWA manifest icons return 404 (no-failed-responses test skipped) | Low | Known / documented |
| BUG-A11Y-01 | Accessibility | Sort `<select>` has no accessible name (`select-name` WCAG violation) | Critical | Open (pre-existing; in allowlist) |
| BUG-PERF-01 | Performance | `LanternError: missing metric scores` logged during Lighthouse audit | Low | Non-blocking warning |
| BUG-PERF-02 | Performance | Lighthouse SEO score is 63 — low but above the 50 threshold | Low | Informational |
| BUG-PERF-03 | Performance | Lighthouse Best Practices score is 77 | Low | Informational |
| BUG-SEC-01 | Security | All 5 recommended security headers are absent from HTTP responses | Critical | Open |
| BUG-SEC-02 | Security | Session cookie missing `HttpOnly` and `Secure` flags | High | Open |
| BUG-SEC-03 | Security | `access-control-allow-origin: *` served on every response | Medium | Open |

---

## Pillar 1 — UI / Functional

### BUG-UI-01 · `problem_user` — all product images show `sl-404` placeholder

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Affects** | `problem_user` account |
| **Page** | `/inventory.html` |
| **Spec** | `tests/ui/coverage-showcase.spec.ts` — "problem_user inventory shows broken images" |

**Description:** Every product image `src` resolves to the same error-placeholder path (`/static/media/sl-404.168b1cce10384b857a6f.jpg`) regardless of the product. Standard users see correct product-specific images; only `problem_user` is affected.

**Evidence:**
```
All 6 image srcs → "/static/media/sl-404.168b1cce10384b857a6f.jpg"
```

**Impact:** A user assigned the `problem_user` credentials cannot visually identify any product from the listing page.

**Note:** This is an intentional injected defect on the demo site. The test documents the defect; no fix is expected.

---

### BUG-UI-02 · `problem_user` — inventory sorting has no effect

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Affects** | `problem_user` account |
| **Page** | `/inventory.html` |
| **Spec** | `tests/ui/coverage-showcase.spec.ts` — "problem_user sorting does not reorder the inventory list" |

**Description:** For `problem_user`, selecting any sort option (Name Z→A, Price low→high, Price high→low) leaves the product list in its original A→Z order. The `<select>` value changes visually but the DOM order is not updated.

**Evidence:**
```
Sort Z→A selected → names remain: ["Sauce Labs Backpack", "Sauce Labs Bike Light", ...]  (A→Z, not Z→A)
Sort lohi selected → prices remain in original unsorted order
```

**Impact:** `problem_user` cannot filter products by price or reverse-alphabetical order.

---

### BUG-UI-03 · `problem_user` — checkout last-name input wired to first-name field

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Affects** | `problem_user` account |
| **Page** | `/checkout-step-one.html` |
| **Spec** | `tests/ui/coverage-showcase.spec.ts` — "problem_user checkout form: last name field input is misdirected to first name" |

**Description:** The last-name input (`data-test="lastName"`) has an `onInput` handler wired to the first-name field's state. Typing into `lastName` actually updates the `firstName` DOM value instead, leaving `lastName` permanently empty.

**Evidence:**
```
Action:  lastNameInput.fill("Lovelace")
Result:  firstNameInput.inputValue() → "Lovelace"
         lastNameInput.inputValue()  → ""   ← always empty
```

**Root cause:** JavaScript event handler on the `lastName` input updates the wrong state variable.

---

### BUG-UI-04 · `problem_user` — checkout permanently blocked

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Affects** | `problem_user` account |
| **Page** | `/checkout-step-one.html` |
| **Spec** | `tests/ui/coverage-showcase.spec.ts` — "problem_user checkout form: last name field input is misdirected to first name" |

**Description:** As a direct consequence of BUG-UI-03, the checkout form always fails validation with `"Error: Last Name is required"` for `problem_user`. There is no way to complete an order with this account regardless of what the user types.

**Reproduction steps:**
1. Login as `problem_user` / `secret_sauce`
2. Add any item to cart
3. Open cart → click Checkout
4. Fill First Name, Last Name, Postal Code
5. Click Continue
6. **Expected:** Advance to order overview
7. **Actual:** Error — "Error: Last Name is required"

---

## Pillar 2 — Visual Regression

### BUG-VIS-01 · Visual baselines are not portable across operating systems

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Affects** | All visual regression tests in CI |
| **Spec** | `tests/visual/visual-regression.spec.ts` |

**Description:** Playwright renders fonts and anti-aliasing differently on macOS vs Linux. Baselines committed from a macOS machine will produce pixel-diff failures when the same tests run on a Linux CI runner, even for functionally identical pages.

**Current state:** macOS baselines are committed. No Linux baselines exist in the repository yet.

**Mitigation:** The `maxDiffPixelRatio: 0.02` tolerance absorbs minor rendering variation. For CI, run the visual suite inside the Playwright Docker container and commit the resulting Linux baselines:
```bash
docker run --rm -v "$PWD:/work" -w /work mcr.microsoft.com/playwright:v1.61.1-noble \
  npx playwright test tests/visual --update-snapshots
```

---

## Pillar 3 — Network

### BUG-NET-01 · Static host returns HTTP 404 for direct `.html` document requests

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Affects** | All browsers — direct `.html` URL navigation |
| **Spec** | `tests/network/xhr.spec.ts` |

**Description:** The saucedemo static host (GitHub Pages via Fastly) returns `HTTP/2 404` for any direct `.html` document request (e.g. `GET /inventory.html`). The SPA shell still loads because the host serves a fallback `index.html`, but the document-level status code is incorrect.

**Evidence (curl):**
```
curl -sI https://www.saucedemo.com/inventory.html
→ HTTP/2 404
   server: GitHub.com
   content-type: text/html; charset=utf-8
```

**Impact:** No hard failure — the app renders correctly — but it means:
- `resourceType() === 'document'` responses must be excluded from "no failed requests" checks.
- Screen readers or crawlers that rely on 200-status documents may fail.
- Bookmarked direct URLs appear as 404 in server logs.

---

### BUG-NET-02 · Firefox eagerly fetches missing PWA manifest icons (404)

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Affects** | Firefox only |
| **Spec** | `tests/network/xhr.spec.ts` — "inventory loads with no failed (4xx/5xx) responses" — **skipped on Firefox** |

**Description:** Firefox fetches PWA icon references from the web app manifest immediately on page load. The icon files (`icon-192x192.png`, etc.) are absent from the saucedemo static host and return 404. Chromium and WebKit only fetch icons lazily (during PWA install), so they are not affected.

**Evidence:**
```
Firefox request: GET /icon-192x192.png → 404
Test disposition: test.skip(browserName === 'firefox', '...')
```

**Impact:** A real-world Firefox user would see broken icons in their browser's installed-app UI. The test is skipped, not failed, because this is a site gap outside the suite's control.

---

## Pillar 4 — Accessibility

### BUG-A11Y-01 · Sort `<select>` has no accessible name (`select-name`)

| Field | Detail |
|-------|--------|
| **Severity** | Critical (WCAG 2.x Level A) |
| **Affects** | All users relying on assistive technology; all browsers |
| **Page** | `/inventory.html` |
| **WCAG criterion** | 4.1.2 Name, Role, Value (Level A) |
| **axe rule ID** | `select-name` |
| **Spec** | `tests/a11y/accessibility.spec.ts` — in `KNOWN_CRITICAL` allowlist |

**Description:** The product-sort `<select>` element on the inventory page has no `<label>`, `aria-label`, or `aria-labelledby` attribute. Screen readers announce the control as an unlabeled form element, giving no indication of its purpose.

**Evidence (axe scan result):**
```
Page: /inventory.html
Violations: 1
  [critical] select-name: Select element must have an accessible name (1 node)
```

**Current gating:** This violation is in the `KNOWN_CRITICAL` allowlist — it is tracked but does not fail the build. Any *new* critical violation outside the allowlist would hard-fail.

**Recommended fix:**
```html
<!-- Option A: visible label -->
<label for="product-sort">Sort by</label>
<select id="product-sort" data-test="product-sort-container">...</select>

<!-- Option B: aria-label (if label is not desired visually) -->
<select aria-label="Sort products" data-test="product-sort-container">...</select>
```

**Pages with 0 violations:** login, cart, checkout step 1, checkout overview.

---

## Pillar 5 — Performance

### BUG-PERF-01 · `LanternError: missing metric scores` logged during Lighthouse audit

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Affects** | Chromium only (`lighthouse audit` test) |
| **Spec** | `tests/performance/performance.spec.ts` |

**Description:** The Lighthouse audit emits a non-fatal `LanternError: missing metric scores for specified navigation` to stderr on every run. The audit still completes and all category scores are above thresholds.

**Evidence:**
```
LanternError: missing metric scores for specified navigation
    at Module.createProcessedNavigation (trace/LanternComputationData.ts:23)
    ...
performance record is 91 (threshold 50) ✓
```

**Impact:** The error is cosmetic — all assertions pass. It may indicate that Lighthouse's Lantern model cannot fully simulate one of the navigations (likely the SPA client-side route transition). No action required unless Lighthouse is upgraded and the error becomes a hard failure.

---

### BUG-PERF-02 · Lighthouse SEO score of 63

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Affects** | Chromium |
| **Spec** | `tests/performance/performance.spec.ts` — threshold is 50 |

**Description:** The Lighthouse SEO audit scores saucedemo at 63/100, indicating several missing or suboptimal SEO signals. The current threshold is a permissive 50, so the test passes. The score breakdown (from Lighthouse categories) suggests issues such as missing meta descriptions, robots.txt, or structured data.

**Evidence:**
```
seo record is 63 (threshold 50) ✓
```

**Impact:** Informational for a demo site. If saucedemo were a production site, a score of 63 would indicate significant SEO gaps.

---

### BUG-PERF-03 · Lighthouse Best Practices score of 77

| Field | Detail |
|-------|--------|
| **Severity** | Low |
| **Affects** | Chromium |
| **Spec** | `tests/performance/performance.spec.ts` — threshold is 50 |

**Description:** The Lighthouse Best Practices audit scores 77/100. Contributing factors typically include: use of non-HTTPS resources, deprecated APIs, browser errors in the console, or missing `<DOCTYPE>`. Passes the 50 threshold.

**Evidence:**
```
best-practices record is 77 (threshold 50) ✓
```

---

## Pillar 6 — Security

### BUG-SEC-01 · All 5 recommended security headers absent from HTTP responses

| Field | Detail |
|-------|--------|
| **Severity** | Critical |
| **Affects** | All browsers, all pages |
| **Spec** | `tests/security/security.spec.ts` — "security headers are audited" (soft assertions) |

**Description:** A live HTTP response audit of `https://www.saucedemo.com/inventory.html` confirms that **none** of the five recommended security headers are present.

**Evidence (curl `HEAD` response):**
```
HTTP/2 404
server: GitHub.com
content-type: text/html; charset=utf-8
access-control-allow-origin: *
x-proxy-cache: MISS
...
```

| Header | Present | Risk if absent |
|---|---|---|
| `Strict-Transport-Security` | **No** | Browser may allow downgrade to HTTP |
| `X-Content-Type-Options` | **No** | MIME-sniffing attacks possible |
| `X-Frame-Options` | **No** | Clickjacking via iframe possible |
| `Content-Security-Policy` | **No** | XSS and data injection attacks |
| `Referrer-Policy` | **No** | Full URL leaked in `Referer` header to third parties |

**Current gating:** All assertions are soft — the test never fails the build. For a demo site, this is intentional. For a production site, all five headers would be required.

**Recommended mitigations (for reference):**
```
Strict-Transport-Security: max-age=63072000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
Referrer-Policy: strict-origin-when-cross-origin
```

---

### BUG-SEC-02 · Session cookie missing `HttpOnly` and `Secure` flags

| Field | Detail |
|-------|--------|
| **Severity** | High |
| **Affects** | All browsers |
| **Spec** | `tests/security/security.spec.ts` — "session cookie attributes are inspected after login" (soft assertions) |

**Description:** The `session-username` cookie set after login is missing two critical hardening flags.

**Evidence (live cookie inspection):**
```json
{
  "name": "session-username",
  "value": "standard_user",
  "httpOnly": false,
  "secure": false,
  "sameSite": "Lax"
}
```

| Flag | Actual | Expected | Risk |
|---|---|---|---|
| `HttpOnly` | `false` | `true` | JavaScript can read the session cookie — XSS can steal sessions |
| `Secure` | `false` | `true` | Cookie transmitted over plain HTTP — susceptible to interception |
| `SameSite` | `Lax` | `Strict` or `Lax` | `Lax` is acceptable; prevents CSRF on cross-site navigations |

**Current gating:** Soft assertions — the test passes regardless. The cookie inspection JSON is attached to the Allure run for manual review.

---

### BUG-SEC-03 · Wildcard `Access-Control-Allow-Origin: *` on all responses

| Field | Detail |
|-------|--------|
| **Severity** | Medium |
| **Affects** | All browsers |
| **Spec** | Not currently tested (header noted in live audit) |

**Description:** Every HTTP response includes `access-control-allow-origin: *`, meaning any origin on the internet can read the response body. For a public demo site with no sensitive data, this is low risk, but the wildcard CORS policy would be inappropriate for any site that sets authenticated cookies or returns private data.

**Evidence:**
```
curl -sI https://www.saucedemo.com/inventory.html
→ access-control-allow-origin: *
```

**Recommendation:** Add a test to the security pillar that asserts `access-control-allow-origin` is not `*` for authenticated endpoints (or is absent entirely if CORS is not needed).

---

## Cross-Browser Notes

| Finding | Chromium | Firefox | WebKit | Mobile Chrome | Mobile Safari |
|---|---|---|---|---|---|
| All UI flows pass | ✓ | ✓ | ✓ | ✓ | ✓ |
| No-failed-responses network test | ✓ Pass | — Skip | ✓ Pass | ✓ Pass | n/a |
| `performance_glitch_user` login measurably slower | ~7.6s | ~7.8s | ~7.8s | ~7.6s | ~7.7s |
| Visual regression (vs macOS baselines) | ✓ | ✓ | ✓ | n/a | n/a |

---

## Defect Counts by Pillar

| Pillar | Critical | High | Medium | Low | Total |
|--------|----------|------|--------|-----|-------|
| UI / Functional | 2 | 2 | 0 | 0 | **4** |
| Visual Regression | 0 | 0 | 1 | 0 | **1** |
| Network | 0 | 0 | 1 | 1 | **2** |
| Accessibility | 1 | 0 | 0 | 0 | **1** |
| Performance | 0 | 0 | 0 | 3 | **3** |
| Security | 1 | 1 | 1 | 0 | **3** |
| **Total** | **4** | **3** | **3** | **4** | **14** |

---

## Triage Recommendation

### Fix in a production site — would be P0/P1

- **BUG-SEC-01** — Add security headers at the CDN/hosting layer
- **BUG-SEC-02** — Set `HttpOnly; Secure` flags on the session cookie server-side
- **BUG-A11Y-01** — Add `aria-label` to the sort `<select>` (one-line fix)

### Monitor — acceptable for a demo site, document for production

- **BUG-UI-01 → BUG-UI-04** — Intentional injected defects; tests document and detect them
- **BUG-NET-01** — Known SPA hosting behaviour; excluded from network assertions
- **BUG-NET-02** — Firefox skip is pinned; unpin if saucedemo adds the icon files
- **BUG-SEC-03** — Acceptable for a public demo; would be P1 for a production API

### Informational — no action required

- **BUG-VIS-01** — Document the Linux-baseline workflow in CI setup
- **BUG-PERF-01** — Monitor across Lighthouse version upgrades
- **BUG-PERF-02 / BUG-PERF-03** — Scores above thresholds; thresholds can be tightened
