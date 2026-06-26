import type { Page } from '@playwright/test';

export interface NavigationTimings {
  /** Time to DOMContentLoaded, in ms, relative to navigation start. */
  domContentLoaded: number;
  /** Time to the `load` event, in ms. */
  load: number;
  /** Time to first byte, in ms. */
  ttfb: number;
  /** First Contentful Paint, in ms (NaN if unavailable). */
  fcp: number;
}

/**
 * Reads Navigation Timing + paint metrics from the page via the standard
 * `performance` APIs. Works in any engine (no CDP required).
 */
export async function getNavigationTimings(page: Page): Promise<NavigationTimings> {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    const fcpEntry = performance
      .getEntriesByType('paint')
      .find((e) => e.name === 'first-contentful-paint');

    return {
      domContentLoaded: nav ? nav.domContentLoadedEventEnd : Number.NaN,
      load: nav ? nav.loadEventEnd : Number.NaN,
      ttfb: nav ? nav.responseStart : Number.NaN,
      fcp: fcpEntry ? fcpEntry.startTime : Number.NaN,
    };
  });
}

/**
 * Observes Largest Contentful Paint. LCP is reported asynchronously, so we wait
 * a short settle period after load before resolving with the latest value.
 */
export async function getLargestContentfulPaint(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let lcp = 0;
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            lcp = entries[entries.length - 1].startTime;
          });
          observer.observe({ type: 'largest-contentful-paint', buffered: true });
          // Give the browser a moment to flush the final LCP candidate.
          setTimeout(() => {
            observer.disconnect();
            resolve(lcp);
          }, 1000);
        } catch {
          // largest-contentful-paint is not supported (e.g. WebKit) → NaN.
          resolve(Number.NaN);
        }
      }),
  );
}
