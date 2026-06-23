import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

/**
 * Contact Form Tests
 * NOTE: These tests mock/intercept API calls. Turnstile is bypassed in test env.
 */

test.describe('Contact Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
  });

  test('form renders with all required fields', async ({ page }) => {
    const form = page.locator('form').filter({ has: page.locator('[name="first_name"]') }).first();
    await expect(form).toBeVisible();

    await expect(page.locator('[name="first_name"]')).toBeVisible();
    await expect(page.locator('[name="email"]')).toBeVisible();
    await expect(page.locator('[name="phone"]')).toBeVisible();
    await expect(page.locator('[name="service"]')).toBeVisible();
    await expect(page.locator('[name="message"]')).toBeVisible();
    await expect(page.locator('#contact-submit')).toBeVisible();
  });

  test('form validation prevents empty submission', async ({ page }) => {
    const submitBtn = page.locator('#contact-submit');
    await submitBtn.click();

    // HTML5 validation should prevent submit
    await expect(page.locator('form').filter({ has: page.locator('[name="first_name"]') }).first()).toBeVisible();
    await expect(page.locator('#contact-success')).toBeHidden();
  });

  test('honeypot field is visually hidden from users', async ({ page }) => {
    const honeypot = page.locator('input[name="_gotcha"]');
    // Honeypot uses opacity-0, h-0, w-0, -z-10 rather than display:none
    await expect(honeypot).toHaveCount(1);
    // Check it's not practically interactable
    const tabindex = await honeypot.getAttribute('tabindex');
    expect(tabindex).toBe('-1');
  });

  test('successful submission shows success state', async ({ page }) => {
    // Intercept the API call and return success
    await page.route('**/api/contact', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.locator('[name="first_name"]').fill('Test User');
    await page.locator('[name="email"]').fill('test@example.com');
    await page.locator('[name="phone"]').fill('(956) 555-1234');
    await page.locator('[name="service"]').selectOption('Clinical Research');
    await page.locator('[name="message"]').fill('This is a test message for the contact form.');

    // Set form_loaded to bypass timing check and inject fake turnstile token
    await page.evaluate(() => {
      const formLoaded = document.querySelector('input[name="_form_loaded"]') as HTMLInputElement;
      if (formLoaded) formLoaded.value = (Date.now() - 10000).toString();

      // Inject fake turnstile token so client-side validation passes
      const tokenInput = document.createElement('input');
      tokenInput.type = 'hidden';
      tokenInput.name = 'cf-turnstile-response';
      tokenInput.value = 'test-turnstile-token';
      document.querySelector('form')?.appendChild(tokenInput);
    });

    await page.locator('#contact-submit').click();

    await expect(page.locator('#contact-success')).toBeVisible({ timeout: 5000 });
  });
});
