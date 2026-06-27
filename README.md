# saucedemo-playwright

End-to-end test suite for [saucedemo.com](https://www.saucedemo.com) built with
[Playwright](https://playwright.dev) + TypeScript. It demonstrates six testing
pillars and ships with the **Playwright Agents** (planner / generator / healer)
workflow so an agent can extend the suite.

## Pillars

| Pillar            | Folder                                 | What it covers                                                   |
| ----------------- | -------------------------------------- | ---------------------------------------------------------------- |
| UI / functional   | [tests/ui](tests/ui)                   | Login matrix, inventory sorting, cart, full checkout             |
| Visual regression | [tests/visual](tests/visual)           | Per-project pixel snapshots (desktop + responsive)               |
| Network / XHR     | [tests/network](tests/network)         | Interception, blocking, `route.fulfill` mocks, HAR record/replay |
| Accessibility     | [tests/a11y](tests/a11y)               | axe-core WCAG scans + keyboard navigation                        |
| Performance       | [tests/performance](tests/performance) | Navigation Timing / Web Vitals budgets + Lighthouse              |
| Security          | [tests/security](tests/security)       | Headers, cookie flags, access-control enforcement                |

## Coverage matrix

Three engines (**Chromium, Firefox, WebKit**), three emulated devices
(**Pixel 5, iPhone 13, iPad Pro 11**), and — opt-in — two branded channels
(**Edge, Chrome**).

## Quick start

```bash
npm install
npm run install:browsers      # download Chromium / Firefox / WebKit

npm run update-snapshots      # generate visual baselines for THIS machine first
npm test                      # run the whole suite
npm run report                # open the HTML report
```

> First run: generate visual baselines locally (`npm run update-snapshots`) before
> `npm test`, otherwise the visual specs fail with "snapshot doesn't exist".

## Common commands

```bash
npm run test:ui               # one pillar
npm run test:network
npm run test:a11y
npm run test:perf
npm run test:security

npm run test:chromium         # one project
npm run test:mobile           # the emulated devices
npm run test:branded          # real Edge + Chrome (must be installed)

npx playwright test tests/ui/login.spec.ts --project=chromium   # a single file
npx playwright test -g "checkout completes"                     # by title

npm run codegen               # record new steps
```

## Playwright Agents

This repo is initialized for the Claude agent loop (`.claude/agents/`, `.mcp.json`,
seed at [tests/seed.spec.ts](tests/seed.spec.ts)). Agent-authored plans live in
[specs/](specs). See [CLAUDE.md](CLAUDE.md) for the planner → generator → healer
workflow and the conventions generated tests should follow.

## Honest caveats

- **saucedemo has no real backend API.** The network pillar therefore demonstrates
  interception / mocking / HAR techniques rather than REST assertions. Its static
  host also answers direct `.html` document hits with a `404` status while still
  serving the app shell — handled explicitly in the network specs.
- **"No failed responses" test is skipped on Firefox.** Firefox eagerly fetches
  PWA icon files referenced in the site manifest (`icon-192x192.png`), which
  return `404` on saucedemo's static host. Chromium and WebKit only request these
  icons lazily (during a PWA install flow), so the 404 never surfaces there. The
  test is skipped on Firefox to avoid a false failure caused by a known site gap.
- **a11y / performance / security** assertions reflect a third-party site with
  known gaps. Pre-existing issues are reported (and, for a11y, tracked in an
  allowlist); the suite gates on _regressions_, not the existing backlog.
- **Visual baselines are OS- and browser-specific.** macOS baselines won't match
  Linux CI — see [CLAUDE.md](CLAUDE.md#visual-regression) for the container
  workflow.
- **Security tests are strictly non-invasive** (read-only header / cookie /
  access-control inspection of a site published for testing).
