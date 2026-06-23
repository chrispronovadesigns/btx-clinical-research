import { test, expect } from '@playwright/test';
import { waitForPageReady, criticalPaths } from './helpers';

/**
 * SEO & Schema Markup Tests
 * Verifies structured data, meta tags, Open Graph, and accessibility.
 */

test.describe('SEO — Meta Tags', () => {
  test('homepage has correct Open Graph tags', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', /.+/);
  });

  test('homepage has Twitter card tags', async ({ page }) => {
    await page.goto('/');
    const twitterTitle = await page.locator('meta[name="twitter:title"]').getAttribute('content');
    expect(twitterTitle).toBeTruthy();
  });

  test('all critical pages have viewport meta', async ({ page }) => {
    for (const path of criticalPaths) {
      await page.goto(path, { waitUntil: 'networkidle' });
      const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewport, `Missing viewport on ${path}`).toContain('width=device-width');
    }
  });
});

test.describe('SEO — Structured Data', () => {
  test('homepage has Organization schema', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    const schemas = await page.locator('script[type="application/ld+json"]').all();
    let hasOrganization = false;

    for (const schema of schemas) {
      const content = await schema.textContent();
      if (content?.includes('"Organization"') || content?.includes('"LocalBusiness"')) {
        hasOrganization = true;
        break;
      }
    }

    expect(hasOrganization, 'Homepage should have Organization schema').toBe(true);
  });
});

test.describe('SEO — Accessibility', () => {
  test('all images have alt text', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    const images = await page.locator('img').all();
    const missingAlt: string[] = [];

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const src = await img.getAttribute('src');
      // Decorative images can have empty alt, but should explicitly have the attribute
      if (alt === null) {
        missingAlt.push(src || 'unknown');
      }
    }

    expect(missingAlt, `Images missing alt: ${missingAlt.join(', ')}`).toHaveLength(0);
  });

  test('form inputs have associated labels', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    const inputs = await page.locator('input, textarea, select').all();
    const missingLabels: string[] = [];

    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');
      const title = await input.getAttribute('title');
      const name = await input.getAttribute('name');
      const type = await input.getAttribute('type');

      // Skip hidden/internal inputs (honeypot, timestamps, hidden fields)
      if (name?.startsWith('_') || type === 'hidden') continue;

      const hasLabel =
        ariaLabel || ariaLabelledBy || title ||
        (id && (await page.locator(`label[for="${id}"]`).count()) > 0) ||
        (placeholder && placeholder.length > 5);

      if (!hasLabel) {
        missingLabels.push(name || id || 'unnamed input');
      }
    }

    expect(missingLabels, `Inputs missing labels: ${missingLabels.join(', ')}`).toHaveLength(0);
  });

  test('no duplicate IDs on page', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);

    const ids = await page.evaluate(() => {
      const elements = document.querySelectorAll('[id]');
      const seen = new Set<string>();
      const duplicates: string[] = [];
      for (const el of elements) {
        const id = el.id;
        if (id && seen.has(id)) {
          duplicates.push(id);
        } else {
          seen.add(id);
        }
      }
      return duplicates;
    });

    if (ids.length > 0) {
      console.log('Duplicate IDs found:', ids.join(', '));
    }
    // Log but don't fail — some Astro components may legitimately share IDs in different scopes
    expect(ids.length, `Duplicate IDs: ${ids.join(', ')}`).toBeLessThanOrEqual(0);
  });
});

test.describe('SEO — Sitemap', () => {
  test('sitemap index is valid XML', async ({ page }) => {
    const response = await page.goto('/sitemap-index.xml');
    expect(response!.status()).toBeLessThan(400);

    const body = await response!.text();
    expect(body).toContain('<sitemapindex');
    expect(body).toContain('</sitemapindex>');
  });

  test('sitemap contains expected pages', async ({ page }) => {
    const response = await page.request.get('/sitemap-0.xml');
    if (response.status() >= 400) {
      test.skip(true, 'sitemap-0.xml not found');
      return;
    }

    const body = await response.text();
    expect(body).toContain('https://btxclinicalresearch.com/');
    expect(body).toContain('<urlset');
  });
});
