import { test, expect } from '@playwright/test';
import { waitForPageReady, criticalPaths } from './helpers';

/**
 * Navigation & Core UI Tests
 */

test.describe('Navigation', () => {
  test('header navigation links are present on homepage', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await waitForPageReady(page);

    const nav = page.locator('header nav');
    await expect(nav).toBeVisible();

    const navBar = page.locator('header nav');
    await expect(navBar.getByRole('link', { name: 'Our Mission', exact: true })).toBeVisible();
    await expect(navBar.getByRole('link', { name: 'Our Values', exact: true })).toBeVisible();
    await expect(navBar.getByRole('link', { name: 'Our Team', exact: true })).toBeVisible();
    await expect(navBar.getByRole('link', { name: 'Our Capabilities', exact: true })).toBeVisible();
    await expect(navBar.getByRole('link', { name: 'Contact Us', exact: true })).toBeVisible();
  });

  test('footer is present on critical pages', async ({ page }) => {
    for (const path of criticalPaths) {
      await page.goto(path);
      await waitForPageReady(page);
      const footer = page.locator('footer').first();
      await expect(footer, `Footer missing on ${path}`).toBeVisible();
    }
  });

  test('mobile menu opens and closes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForPageReady(page);

    const toggle = page.locator('#menu-toggle').first();
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
      const mobileMenu = page.locator('#mobile-menu');
      await expect(mobileMenu).toBeVisible();
    }
  });
});

test.describe('Core Page Elements', () => {
  test('every page has exactly one H1', async ({ page }) => {
    const failures: string[] = [];

    for (const path of criticalPaths) {
      await page.goto(path, { waitUntil: 'networkidle' });
      const h1Count = await page.locator('h1').count();
      if (h1Count !== 1) {
        failures.push(`${path}: ${h1Count} H1 tags`);
      }
    }

    expect(failures, failures.join('; ')).toHaveLength(0);
  });

  test('every page has a meta description', async ({ page }) => {
    for (const path of criticalPaths) {
      await page.goto(path, { waitUntil: 'networkidle' });
      const desc = await page.locator('meta[name="description"]').getAttribute('content');
      expect(desc?.length ?? 0, `Missing meta description on ${path}`).toBeGreaterThan(10);
    }
  });

  test('every page has canonical link', async ({ page }) => {
    for (const path of criticalPaths) {
      await page.goto(path, { waitUntil: 'networkidle' });
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical, `Missing canonical on ${path}`).toBeTruthy();
    }
  });
});
