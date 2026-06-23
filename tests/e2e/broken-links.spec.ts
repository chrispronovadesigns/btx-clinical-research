import { test, expect } from '@playwright/test';
import { criticalPaths, getSameOriginLinks, waitForPageReady } from './helpers';

/**
 * Broken Link Checker — crawls same-origin links and verifies 200/OK responses.
 * Tests all critical pages plus discovered links from the homepage.
 */

test.describe.configure({ mode: 'parallel', retries: 2 });

const testedUrls = new Set<string>();

async function assertPageLoads(page, url: string) {
  if (testedUrls.has(url)) return;
  testedUrls.add(url);

  const response = await page.goto(url, { waitUntil: 'networkidle' });
  expect(response, `Failed to load ${url}`).toBeTruthy();
  expect(response!.status(), `Non-200 status for ${url}`).toBeLessThan(400);
  expect(response!.status(), `Non-200 status for ${url}`).toBeGreaterThanOrEqual(200);
}

test.describe('Broken Links — Critical Pages', () => {
  for (const path of criticalPaths) {
    test(`loads ${path}`, async ({ page }) => {
      await assertPageLoads(page, path);
    });
  }
});

test.describe('Broken Links — Homepage Link Crawl', () => {
  test('all same-origin links from homepage return 200', async ({ page, baseURL }) => {
    if (!baseURL) throw new Error('baseURL is required');

    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForPageReady(page);

    const links = await getSameOriginLinks(page, baseURL);
    const uniquePaths = [...new Set(links.map((url) => new URL(url).pathname))];

    // Limit to prevent test timeout on huge sites
    const pathsToTest = uniquePaths.slice(0, 100);

    const failures: string[] = [];

    for (const path of pathsToTest) {
      try {
        const response = await page.request.head(`${baseURL}${path}`, { maxRedirects: 5 });
        if (response.status() >= 400) {
          failures.push(`${path} -> ${response.status()}`);
        }
      } catch (e) {
        failures.push(`${path} -> request failed`);
      }
    }

    if (failures.length > 0) {
      console.error('Broken links found:', failures);
    }
    expect(failures, `Broken links: ${failures.join(', ')}`).toHaveLength(0);
  });
});

test.describe('Broken Links — Assets', () => {
  test('manifest.json loads and is valid JSON', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    expect(response!.status()).toBe(200);
    expect(response!.headers()['content-type']).toContain('application/json');

    const body = await response!.json();
    expect(body.name).toBeTruthy();
    expect(body.short_name).toBeTruthy();
    expect(body.icons).toBeInstanceOf(Array);
    expect(body.icons.length).toBeGreaterThan(0);
  });

  test('service worker loads', async ({ page }) => {
    const response = await page.goto('/sw.js');
    expect(response!.status()).toBe(200);
    const body = await response!.text();
    expect(body.toLowerCase()).toContain('service worker');
  });

  test('favicon exists', async ({ page }) => {
    const response = await page.request.head('/favicon.svg');
    expect(response.status()).toBeLessThan(400);
  });

  test('PWA icon exists', async ({ page }) => {
    const response = await page.request.head('/images/btx-logo-square.png');
    expect(response.status()).toBeLessThan(400);
  });

  test('sitemap loads', async ({ page }) => {
    const response = await page.goto('/sitemap-index.xml');
    expect(response!.status()).toBeLessThan(400);
  });

  test('robots.txt loads', async ({ page }) => {
    const response = await page.goto('/robots.txt');
    expect(response!.status()).toBe(200);
    const body = await response!.text();
    expect(body).toContain('User-agent');
  });
});
