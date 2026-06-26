# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Playwright + TypeScript end-to-end suite for the public demo site
https://www.saucedemo.com. There is **no application source here** — the system
under test is the live remote site. Work happens in the test suite, page objects,
and config.

## Commands

```bash
npm install && npm run install:browsers   # one-time setup

npm test                       # full suite — also writes allure-results/
npm run allure:report          # generate allure-report/ then open in browser
npm run allure:serve           # live-serve directly from allure-results/ (no generate step)
npm run allure:generate        # generate only (no open)

npm test                       # full suite (all engines + devices; setup runs first)
npm run test:ui                # pillar runners: ui | visual | network | a11y | perf | security
npm run test:chromium          # single project (also: test:mobile, test:branded)

# Single file / single test / single project:
npx playwright test tests/ui/login.spec.ts --project=chromium
npx playwright test -g "completes the happy path"
npx playwright test --project=mobile-safari

npm run update-snapshots       # (re)generate visual baselines for the current OS
npm run report                 # open the last HTML report
npm run codegen                # record selectors/steps against the live site
npm run test:debug             # Playwright Inspector
```

Branded channels (`edge`, `google-chrome`) are **opt-in**: they only exist when
`INCLUDE_BRANDED=1` is set (and the apps are installed). `npm test` runs the
bundled engines + emulated devices everywhere without them.

## Architecture

The design that spans multiple files and is worth knowing up front:

- **storageState auth via a `setup` project.** `src/auth.setup.ts` logs in once as
  `standard_user` and saves browser state to `.auth/standard_user.json`. Every
  browser/device project lists `dependencies: ['setup']` and loads that state, so
  the bulk of the suite **starts already authenticated**. Specs that must run
  logged out (login, keyboard-nav, access-control, the visual login page) opt out
  per-file with `test.use({ storageState: { cookies: [], origins: [] } })`.
  - Consequence: `auth.setup.ts` lives in `src/`, outside the global `testDir`
    (`./tests`), so the `setup` project sets its own `testDir: './src'` in
    [playwright.config.ts](playwright.config.ts). Keep it there.

- **Page Object Model in `src/pages/`.** `BasePage` owns the shared header
  (burger-menu logout, cart badge/link); `LoginPage` is standalone (no header).
  Page classes expose intent-level methods, not raw locators.

- **Custom fixtures in `src/fixtures/test.ts`.** Import `test`/`expect` from there
  (not from `@playwright/test`) to get a page object per fixture plus a
  `loginAs(userKey)` helper. This is the entry point for every spec.

- **Locators use `getByTestId`.** The config sets `testIdAttribute: 'data-test'`,
  which maps directly onto saucedemo's own `data-test` attributes. Prefer test IDs
  over CSS/text. Test data (accounts, products, expected errors, tax rate) is
  centralized in `src/data/users.ts` — reuse it, don't hardcode.

- **Projects** (in `playwright.config.ts`): `setup` → desktop engines
  (chromium/firefox/webkit) → opt-in branded channels (edge/chrome) → emulated
  devices (mobile-chrome=Pixel 5, mobile-safari=iPhone 13, tablet=iPad Pro 11).

## Pillar-specific notes

### Visual regression

Snapshots are namespaced **per project + OS** under
`tests/visual/*-snapshots/` (e.g. `inventory-mobile-safari-darwin.png`). Running
the visual spec under a device project automatically yields that device's
responsive baseline. Baselines are **not portable across OSes** — macOS baselines
won't match Linux CI. To produce Linux baselines for CI, run inside the matching
container and commit the result:

```bash
docker run --rm -v "$PWD:/work" -w /work mcr.microsoft.com/playwright:v1.61.1-noble \
  npx playwright test tests/visual --update-snapshots
```

### Network / XHR — saucedemo quirks (important)

- saucedemo is a **client-routed SPA**: reaching `/inventory.html` after login does
  **not** issue a new document request. Synchronize on asset responses
  (`waitForResponse(r => r.url().endsWith('.js'))`), not on a document navigation.
- Its static host returns **HTTP 404 for direct `.html` document hits** while still
  serving the app shell. "No failed responses" checks must exclude
  `resourceType() === 'document'` (see `tests/network/xhr.spec.ts`).

### Accessibility

axe scans gate on **new `critical` violations only**. Pre-existing site defects are
tracked in the `KNOWN_CRITICAL` allowlist in `tests/a11y/accessibility.spec.ts`
(currently `select-name` — the unlabeled sort dropdown). Add to the allowlist
deliberately, with a comment, when a defect is acknowledged.

Each scan attaches a **rendered HTML report** (via `axe-html-reporter`) plus the
raw JSON. To read them: `npm run report` → open an a11y test → the `axe-<page>.html`
attachment renders a violations table with impact and fix links. The interactive
`npm run pw:ui:runner` (Playwright UI mode) is also a good way to inspect a run's
attachments, traces, and steps live.

### Performance

Web Vitals run on every engine with **lenient budgets** (it's a public site over
the internet). LCP and the Lighthouse audit are **Chromium-only** and guard
themselves with `test.skip(testInfo.project.name !== 'chromium', ...)`. Lighthouse
launches its own browser on a fixed `--remote-debugging-port`.

### Security

Strictly **non-invasive**: header audit (report-style via soft assertions),
session-cookie flag inspection, and the one hard gate that matters — **access
control**: protected paths requested while logged out must bounce to login.

## Playwright Agents

Initialized for the Claude loop. Files: `.claude/agents/playwright-test-{planner,
generator,healer}.md`, `.mcp.json` (the `playwright-test` MCP server), plans in
`specs/`, and the customized seed at `tests/seed.spec.ts`.

Workflow:

1. **Planner** explores the live site and writes a Markdown plan into `specs/`.
2. **Generator** turns a plan into a runnable spec. It runs `tests/seed.spec.ts`
   first to boot the environment — that seed documents the conventions above
   (baseURL, `getByTestId`, credentials, the `src/` fixtures/POM) so generated
   tests should reuse them rather than reinventing locators.
3. **Healer** runs failing tests and proposes fixes.

When generating new tests by hand or via the agent, follow the existing patterns:
import from `src/fixtures/test.ts`, use page objects, pull data from
`src/data/users.ts`, and use `getByTestId`.

## Gotchas

- `npm test` depends on `.auth/standard_user.json`; the `setup` project creates it
  automatically, but if you run a single non-setup spec in isolation and see an
  ENOENT for that file, run the `setup` project (or any normal `npm test`) once.
- The default-authenticated storage state has an **empty cart** (captured at setup
  time), so each test starts with a clean cart even though state is shared.
- `tests/seed.spec.ts` is part of the suite and runs in CI — keep it green.
