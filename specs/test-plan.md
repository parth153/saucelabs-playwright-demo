# Test Plan — saucedemo E2E Suite

## 1. Scope

### In Scope

| Area | Covered |
|------|---------|
| Login / Authentication | Happy path, locked-out, invalid credentials, missing fields, user matrix, logout |
| Inventory page | Catalog rendering, sorting (A→Z, Z→A, price low→high, high→low), add/remove cart badge, product detail navigation |
| Cart | Add items, remove items, item count, continue-shopping, persistence across reload |
| Checkout | Happy path (step 1 → step 2 → complete), pricing math (item total + tax = grand total), first-name validation, cancel flow |
| Visual layout | Login, inventory, cart, checkout-overview — full-page screenshots across desktop, mobile, and tablet viewports |
| Network behaviour | Sub-resource health, JS/CSS asset validation, image blocking resilience, route mocking, action-scoped `waitForResponse`, HAR record/replay |
| Accessibility | WCAG 2.x axe scans on login, inventory, cart, checkout info, checkout overview; keyboard login flow |
| Performance | TTFB / DOMContentLoaded / load budgets; LCP (Chromium); Lighthouse audit (Chromium); slow-user detection |
| Security | Access control on protected routes; HTTPS transport; security headers audit; session-cookie attribute inspection |

### Out of Scope

- Backend APIs (saucedemo is entirely client-side; there is no REST backend)
- `problem_user`, `error_user`, `visual_user` accounts (intentional defect injection; no specs yet)
- Payment processing (demo site; no real transactions)
- Active/invasive security testing (fuzzing, injection, load, brute-force)
- Email/notification flows
- Admin or CMS functionality

---

## 2. Test Environment

### System Under Test

| Attribute | Value |
|-----------|-------|
| URL | `https://www.saucedemo.com` (overridable via `BASE_URL` env var) |
| Type | Publicly hosted SPA (React, client-side routing) |
| Auth | Pre-seeded demo accounts; shared password `secret_sauce` (overridable via `PASSWORD`) |

### Test Runner

| Attribute | Value |
|-----------|-------|
| Framework | Playwright (TypeScript) |
| Node.js | ≥ 18 (whatever is on the machine; version logged in Allure env) |
| Browsers bundled | Chromium, Firefox, WebKit |
| Devices emulated | Pixel 5 (mobile-chrome), iPhone 13 (mobile-safari), iPad Pro 11 (tablet) |
| Branded channels | Edge, Google Chrome — opt-in via `INCLUDE_BRANDED=1` |
| Parallelism | `fullyParallel: true`; CI uses 1 worker, local uses Playwright's default |
| Retries | 2 (configured globally) |

### Local Prerequisites

```bash
node -v              # ≥ 18
npm install          # install dependencies
npm run install:browsers  # download Playwright browser binaries
```

### CI Prerequisites

- Playwright Docker image `mcr.microsoft.com/playwright:v1.61.1-noble` for Linux visual baselines.
- Set `HOME=/root` when running Firefox inside the container.
- `INCLUDE_BRANDED=1` if Edge/Chrome channels are installed on the CI runner.

---

## 3. Test Execution

### Running the Full Suite

```bash
npm test
```

Runs all projects (setup → desktop engines → device emulation) with Allure reporter writing to `allure-results/`.

### Smoke Run

```bash
npx playwright test --grep @smoke
```

Covers the single highest-severity test in each pillar — sufficient to verify the SUT is reachable and the critical path is intact.

| @smoke test | File |
|---|---|
| `standard_user reaches the inventory` | `tests/ui/login.spec.ts` |
| `shows the full catalog` | `tests/ui/inventory.spec.ts` |
| `add then remove updates the cart badge` | `tests/ui/inventory.spec.ts` |
| `reflects items added from the inventory` | `tests/ui/cart.spec.ts` |
| `completes the happy path` | `tests/ui/checkout.spec.ts` |
| `locked_out_user is blocked with an error` | `tests/ui/login.spec.ts` |
| `login page` (a11y) | `tests/a11y/accessibility.spec.ts` |
| `direct access to /inventory.html while logged out is denied` | `tests/security/security.spec.ts` |
| `inventory loads with no failed responses` | `tests/network/xhr.spec.ts` |

### Targeted Runs

```bash
# Single pillar
npx playwright test tests/ui/checkout.spec.ts

# Single browser
npm run test:chromium       # or test:firefox, test:webkit, test:mobile, test:branded

# Single test by name
npx playwright test -g "completes the happy path"

# Single file on a single project
npx playwright test tests/visual/visual-regression.spec.ts --project=mobile-safari
```

### Visual Baseline Refresh

```bash
# Local (macOS)
npm run update-snapshots

# Linux / CI
docker run --rm -v "$PWD:/work" -w /work mcr.microsoft.com/playwright:v1.61.1-noble \
  npx playwright test tests/visual --update-snapshots
```

### Reporting

```bash
npm run allure:report    # generate allure-report/ and open in browser
npm run allure:serve     # live-serve directly from allure-results/ (no generate step)
npm run report           # open last Playwright HTML report
```

---

## 4. Entry Criteria

| Criterion | Detail |
|---|---|
| Environment reachable | `https://www.saucedemo.com` responds with HTTP 200 or expected SPA shell |
| Auth seeded | `.auth/standard_user.json` exists (created by `setup` project or a prior full run) |
| Dependencies installed | `node_modules/` populated; browser binaries downloaded |
| Visual baselines committed | `tests/visual/*-snapshots/` contains baselines for the target OS |

---

## 5. Exit Criteria

| Criterion | Pass condition |
|---|---|
| All @smoke tests pass | Zero failures across all projects in the smoke tag |
| No new critical a11y violations | `KNOWN_CRITICAL` allowlist unchanged; no new hard-assert failures |
| No access-control bypass | All three protected paths redirect to login |
| Visual diff within tolerance | ≤ 2 % pixel diff per snapshot |
| No sub-resource 4xx/5xx | Network spec passes on Chromium and WebKit |
| Performance budgets met | TTFB < 3 s, DOMContentLoaded < 6 s, Load < 8 s |

---

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| saucedemo site goes offline or changes its markup | Medium | High | Spec failures surface immediately; no code change needed until attributes change |
| Network variance causes performance failures | High | Low | Lenient budgets (3–8 s); 2 retries configured |
| Visual snapshots drift after site CSS update | Medium | Medium | `npm run update-snapshots` re-baselines; diff threshold absorbs minor anti-aliasing variation |
| Firefox PWA icon 404 causes false network failure | Known | Low | `test.skip` on Firefox for the no-failed-responses test; documented in spec and CLAUDE.md |
| OS rendering differences break visual baselines | Medium | Medium | Baselines are namespaced per OS; Linux container baselines committed separately for CI |
| `standard_user.json` stale / missing on first run | Low | Medium | Running `npm test` (or the `setup` project) regenerates it |
| Lighthouse port conflict (`--remote-debugging-port=9222`) | Low | Low | Lighthouse spec opens its own browser; no conflict with the test runner browser |

---

## 7. Deliverables

| Deliverable | Location |
|---|---|
| Allure HTML report | `allure-report/` (generated on demand) |
| Playwright HTML report | `playwright-report/` |
| Visual diff artifacts | `test-results/` (on failure) |
| A11y HTML report attachments | Allure run → test → attachments |
| Security headers JSON | Allure run → security test → attachments |
| Session cookie JSON | Allure run → security test → attachments |
| HAR recording | `test-results/<test>/inventory.har` (network HAR test) |
| Lighthouse HTML report | `test-results/<test>/lighthouse-*.html` |
