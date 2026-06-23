import { Page, expect } from '@playwright/test';

/**
 * Wait for fonts and critical CSS to load before taking screenshots or asserting layout.
 */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Check if an element exists on the page without failing if it doesn't.
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  return (await page.locator(selector).count()) > 0;
}

/**
 * Test a link returns 200 (or acceptable redirect) by making a HEAD request.
 * This avoids navigating away from the current page.
 */
export async function checkLinkHealth(
  page: Page,
  url: string,
  allowedRedirects: string[] = []
): Promise<{ ok: boolean; status: number; finalUrl?: string }> {
  try {
    const response = await page.request.head(url, { maxRedirects: 5 });
    const status = response.status();
    const finalUrl = response.url();

    if (status >= 200 && status < 400) {
      return { ok: true, status, finalUrl };
    }

    if (allowedRedirects.includes(finalUrl)) {
      return { ok: true, status, finalUrl };
    }

    return { ok: false, status, finalUrl };
  } catch (e) {
    return { ok: false, status: 0 };
  }
}

/**
 * Common page paths to test. Excludes API routes and dynamic patterns.
 */
export const criticalPaths = ['/', '/privacy-policy/'];

/**
 * Extract all href attributes from anchor tags on the current page,
 * filtering to same-origin links only.
 */
export async function getSameOriginLinks(page: Page, baseURL: string): Promise<string[]> {
  const links = await page.locator('a[href]').all();
  const hrefs = new Set<string>();

  for (const link of links) {
    const href = await link.getAttribute('href');
    if (!href) continue;
    if (href.startsWith('http') && !href.startsWith(baseURL)) continue;
    if (href.startsWith('#')) continue;
    if (href.startsWith('mailto:')) continue;
    if (href.startsWith('tel:')) continue;
    if (href.startsWith('javascript:')) continue;

    const resolved = new URL(href, baseURL).href;
    if (resolved.startsWith(baseURL)) {
      hrefs.add(resolved);
    }
  }

  return Array.from(hrefs);
}
