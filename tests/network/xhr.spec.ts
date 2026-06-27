import { test, expect } from '../../src/fixtures/test.js';
import { PRODUCTS } from '../../src/data/users.js';
import { annotate, step, Severity } from '../../src/utils/allure.js';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Network-layer testing. saucedemo is a static client-side app with no REST
 * backend, so these specs exercise the Playwright network toolbox that applies
 * to such an app: response capture/assertions, resource blocking, route
 * mocking, action-scoped waits, and HAR record/replay.
 */
test.describe('network', () => {
  test(
    'inventory loads with no failed (4xx/5xx) responses',
    { tag: '@smoke' },
    async ({ inventoryPage, page, browserName }) => {
      // Firefox eagerly fetches PWA icon references in the HTML manifest, and
      // saucedemo's static host returns 404 for those icon files on all browsers.
      // Chromium/WebKit only fetch icons lazily (PWA install flow), so this 404
      // never surfaces there. Skipping Firefox avoids a false failure.
      test.skip(
        browserName === 'firefox',
        'Firefox eagerly fetches missing PWA icons (icon-192x192.png) that return 404 on saucedemo — known site gap, not a regression.',
      );

      await annotate(
        'Network Interception',
        'Response Validation',
        Severity.NORMAL,
        'Confirms that every sub-resource (JS, CSS, images) loaded during the ' +
          'inventory page returns a 2xx status. Document 404s are excluded because ' +
          "saucedemo's static host deliberately returns 404 for direct .html hits " +
          'while still serving the app shell.',
      );

      const failures: string[] = [];

      await step('Listen for failed sub-resource responses', async () => {
        page.on('response', (response) => {
          // Known saucedemo quirk: its static host answers direct `.html` *document*
          // requests with a 404 status while still serving the app shell, so the
          // page renders fine. We therefore gate on sub-resources (JS/CSS/img/xhr),
          // which is what "no failed network requests" actually means here.
          if (response.request().resourceType() === 'document') return;
          if (response.status() >= 400) {
            failures.push(`${response.status()} ${response.url()}`);
          }
        });
      });

      await step('Navigate to inventory page', async () => {
        await inventoryPage.goto();
        await expect(inventoryPage.title).toBeVisible();
      });

      await step('Assert no sub-resource failures', async () => {
        expect(failures, `Unexpected failed responses:\n${failures.join('\n')}`).toEqual([]);
      });
    },
  );

  test('core JS/CSS assets are served with 200 + correct content-type', async ({ page }) => {
    await annotate(
      'Network Interception',
      'Asset Validation',
      Severity.NORMAL,
      'Intercepts every .js and .css response and asserts that each returns ' +
        'HTTP 200 with the expected content-type header.',
    );

    const assets: { url: string; status: number; type: string | undefined }[] = [];

    await step('Collect JS/CSS responses', async () => {
      page.on('response', (response) => {
        const url = response.url();
        if (/\.(js|css)(\?|$)/.test(url)) {
          assets.push({
            url,
            status: response.status(),
            type: response.headers()['content-type'],
          });
        }
      });
      await page.goto('/inventory.html');
      await page.waitForLoadState('networkidle');
    });

    await step('Assert all JS/CSS assets return 200 with correct content-type', async () => {
      expect(assets.length).toBeGreaterThan(0);
      for (const asset of assets) {
        expect(asset.status, asset.url).toBe(200);
        if (asset.url.endsWith('.js')) {
          expect(asset.type).toContain('javascript');
        } else if (asset.url.endsWith('.css')) {
          expect(asset.type).toContain('css');
        }
      }
    });
  });

  test('blocking images leaves the app functional', async ({ page }) => {
    await annotate(
      'Network Interception',
      'Resource Blocking',
      Severity.NORMAL,
      'Intercepts and aborts every image request then verifies the product ' +
        'list still renders and items can still be added to cart. Demonstrates ' +
        'resilience and the route.abort() technique.',
    );

    let blocked = 0;

    await step('Install image-blocking route handler', async () => {
      await page.route('**/*.{png,jpg,jpeg,svg,gif,webp}', async (route) => {
        blocked += 1;
        await route.abort();
      });
    });

    await step('Navigate to inventory with images blocked', async () => {
      await page.goto('/inventory.html');
    });

    await step('Assert catalog renders and cart still works without images', async () => {
      // Even with every image aborted, the product list still renders & works.
      await expect(page.getByTestId('inventory-item')).toHaveCount(6);
      await page.getByTestId(`add-to-cart-${PRODUCTS.backpack.id}`).click();
      await expect(page.getByTestId('shopping-cart-badge')).toHaveText('1');
      expect(blocked).toBeGreaterThan(0);
    });
  });

  test('route.fulfill mocks a network response', async ({ page }) => {
    await annotate(
      'Network Interception',
      'Route Mocking',
      Severity.NORMAL,
      'Uses route.fulfill() to replace every product image response with a ' +
        'synthetic 1×1 PNG, then asserts the mocked content-type was actually ' +
        'delivered — proving the intercept took effect before the browser consumed ' +
        'the response.',
    );

    // Replace every product image with a known 1x1 PNG and assert the override
    // actually took effect over the wire.
    const onePixelPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    let fulfilled = 0;

    await step('Install route.fulfill handler for images', async () => {
      await page.route('**/*.{png,jpg,jpeg}', async (route) => {
        fulfilled += 1;
        await route.fulfill({ contentType: 'image/png', body: onePixelPng });
      });
    });

    let response: Awaited<ReturnType<typeof page.waitForResponse>>;
    await step('Navigate and capture first intercepted image response', async () => {
      const imageResponse = page.waitForResponse((r) => /\.(png|jpg|jpeg)/.test(r.url()));
      await page.goto('/inventory.html');
      response = await imageResponse;
    });

    await step('Assert mock was used and content-type is correct', async () => {
      expect(fulfilled).toBeGreaterThan(0);
      expect(response.headers()['content-type']).toContain('image/png');
    });
  });

  test('waitForResponse synchronizes on an asset request', async ({ loginPage, page }) => {
    await annotate(
      'Network Interception',
      'Action-Scoped Wait',
      Severity.NORMAL,
      'Demonstrates the waitForResponse() pattern: a Promise.all() pairs the ' +
        'action (page.goto) with a response predicate so the test waits for a ' +
        'specific asset rather than a fixed timeout. Uses a JS bundle response ' +
        'because saucedemo uses client-side routing (no HTML document request).',
    );

    await page.context().clearCookies();

    let jsResponse: Awaited<ReturnType<typeof page.waitForResponse>>;

    await step('Navigate and synchronize on a JS bundle response', async () => {
      // Reaching inventory uses client-side routing (no new document request), so
      // we synchronize on a concrete asset response instead — the canonical
      // action-scoped wait pattern.
      [jsResponse] = await Promise.all([
        page.waitForResponse((r) => r.url().endsWith('.js') && r.status() === 200),
        loginPage.goto(),
      ]);
    });

    await step('Assert the JS response was successful', async () => {
      expect(jsResponse.ok()).toBe(true);
      expect(jsResponse.headers()['content-type']).toContain('javascript');
    });
  });

  test('records and replays a HAR (offline mock pattern)', async ({ browser }, testInfo) => {
    await annotate(
      'Network Interception',
      'HAR Record and Replay',
      Severity.NORMAL,
      'Records a full HTTP Archive (HAR) of the inventory page, validates the ' +
        'recording contains JS entries, then replays JS requests from the archive ' +
        'using routeFromHAR(). This demonstrates the offline-mock pattern for ' +
        'pinning tests to a fixed network snapshot.',
    );

    const harPath = path.join(testInfo.outputDir, 'inventory.har');

    await step('Record HAR for the inventory page', async () => {
      // --- Record: capture all traffic for the inventory page into a HAR file.
      const recordContext = await browser.newContext({
        baseURL: 'https://www.saucedemo.com',
        storageState: '.auth/standard_user.json',
        recordHar: { path: harPath, mode: 'full' },
      });
      const recordPage = await recordContext.newPage();
      await recordPage.goto('/inventory.html');
      await recordPage.waitForLoadState('networkidle');
      await recordContext.close(); // flushes the HAR to disk
    });

    await step('Validate HAR contents', async () => {
      expect(fs.existsSync(harPath)).toBe(true);
      const har = JSON.parse(fs.readFileSync(harPath, 'utf-8'));
      expect(har.log.entries.length).toBeGreaterThan(0);
      // The recording captured the JS bundle(s) we will replay from.
      const jsEntries = har.log.entries.filter((e: { request: { url: string } }) =>
        e.request.url.endsWith('.js'),
      );
      expect(jsEntries.length).toBeGreaterThan(0);
    });

    await step('Replay JS requests from HAR and assert page loads', async () => {
      // --- Replay: route matching requests out of the recorded HAR, falling back
      // to live for anything not captured. This is the offline-mock wiring you'd
      // reuse to pin a test to a fixed backend snapshot.
      const replayContext = await browser.newContext({
        baseURL: 'https://www.saucedemo.com',
        storageState: '.auth/standard_user.json',
      });
      const replayPage = await replayContext.newPage();
      await replayPage.routeFromHAR(harPath, { url: '**/*.js', notFound: 'fallback' });

      const [jsFromHar] = await Promise.all([
        replayPage.waitForResponse((r) => r.url().endsWith('.js')),
        replayPage.goto('/inventory.html'),
      ]);
      expect(jsFromHar.ok()).toBe(true);
      await expect(replayPage.getByTestId('inventory-item').first()).toBeVisible();
      await replayContext.close();
    });
  });
});
