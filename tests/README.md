# Astro Boilerplate Test Suite

Comprehensive test suite covering unit/integration tests (Vitest) and end-to-end tests (Playwright).

## Quick Start

```bash
# Install dependencies (including devDependencies)
npm install

# Install Playwright browsers (first time only)
npm run playwright:install

# Run unit tests only
npm run test

# Run unit tests with coverage
npm run test:coverage

# Build and run E2E tests locally
npm run test:e2e

# Run E2E tests with UI for debugging
npm run test:e2e:ui

# Run everything (unit + E2E)
npm run test:all
```

## Test Architecture

### Unit/Integration Tests (`tests/unit/`)

Run in Node.js with mocked external services.

| File | What it tests |
|------|---------------|
| `api/contact.test.ts` | Contact form API: validation, honeypot, rate limiting, Turnstile, Resend email |
| `api/push.test.ts` | Push notification APIs: subscribe, unsubscribe, send (auth, VAPID) |
| `lib/seo/schema.test.ts` | Schema.org builders: Organization, LocalBusiness, Article, Service, Product, FAQ, Breadcrumb, Review |
| `data/validation.test.ts` | Data integrity: testimonials, blog collection schema |

**External services are mocked** via `tests/unit/setup.ts`:
- `resend` — emails.send, contacts.create, batch.send
- `@upstash/redis` — get, set, hset, hgetall, hdel
- `web-push` — setVapidDetails, sendNotification

### E2E Tests (`tests/e2e/`)

Run against a real browser. By default, they build the Astro site and serve it locally on port 4321.

| File | What it tests |
|------|---------------|
| `broken-links.spec.ts` | All critical pages load (200). Homepage link crawl. Asset checks (manifest, sw.js, favicon, sitemap, robots.txt) |
| `navigation.spec.ts` | Header nav, language switcher, footer presence, mobile menu, skip-to-content, H1 count, meta description, canonical |
| `forms.spec.ts` | Contact form fields, validation, honeypot, success flow |
| `pwa.spec.ts` | Manifest fields, theme-color, apple-touch-icon, service worker registration, offline.html, install banner DOM |
| `push-notifications.spec.ts` | Bell button, prompt dialog, toast. API endpoint error responses (400, 401) |
| `live-chat.spec.ts` | CTA buttons present, mobile call vs desktop chat pattern |
| `multilingual.spec.ts` | Spanish pages mirror English: lang attr, hreflang, page pairs load, nav parity, content parity |
| `seo.spec.ts` | Open Graph, Twitter cards, schema.org JSON-LD, image alt text, form labels, duplicate IDs, sitemap validity |

### Playwright Projects

| Project | Viewport | Use case |
|---------|----------|----------|
| `chromium-desktop` | 1280x720 | Desktop layout, full feature tests |
| `chromium-mobile` | 393x851 (Pixel 5) | Mobile layout, responsive behavior |
| `webkit-mobile` | 390x844 (iPhone 12) | Safari mobile, iOS-specific behavior |

## Environment Variables

### Local Development

No env vars needed for unit tests — everything is mocked.

For E2E tests against a deployed URL, create `.env.test.local`:

```bash
PLAYWRIGHT_BASE_URL=https://your-boilerplate.vercel.app
```

### CI/CD (GitHub Actions)

The workflow uses repository secrets. Mock-safe defaults are used if secrets are not set.

| Secret | Used by | Required? |
|--------|---------|-----------|
| `RESEND_API_KEY` | Unit tests (mocked) | No |
| `TURNSTILE_SECRET_KEY` | Unit tests (mocked) | No |
| `VAPID_PUBLIC_KEY` | Unit + E2E | No |
| `VAPID_PRIVATE_KEY` | Unit tests (mocked) | No |
| `VAPID_EMAIL` | Unit tests (mocked) | No |
| `KV_REST_API_URL` | Unit tests (mocked) | No |
| `KV_REST_API_TOKEN` | Unit tests (mocked) | No |
| `PUSH_SEND_SECRET` | Unit tests (mocked) | No |
| `PUBLIC_TURNSTILE_SITE_KEY` | Build (browser) | No |
| `PUBLIC_GA_ID` | Build (browser) | No |

## CI/CD Pipeline

The `.github/workflows/test.yml` runs three jobs:

1. **Unit Tests** — Fast, runs first. Validates API logic, schemas, data.
2. **E2E Local** — Builds Astro site, serves locally, runs full E2E suite.
3. **E2E Preview** — Runs against Vercel preview URL (PRs only).

### Vercel Preview Integration

To test against actual Vercel preview deployments on every PR, add the [Vercel Action](https://github.com/vercel/vercel-action) to the workflow. The workflow already has a placeholder `Determine preview URL` step.

## Debugging Failed Tests

### Unit Tests

```bash
# Watch mode with verbose output
npm run test:watch -- --reporter=verbose

# Run a single test file
npx vitest run tests/unit/api/contact.test.ts

# Debug with coverage
npm run test:coverage -- --reporter=verbose
```

### E2E Tests

```bash
# Run with UI (interactive debugger)
npm run test:e2e:ui

# Run a single test file
npx playwright test tests/e2e/forms.spec.ts

# Run with debug mode (step through)
npm run test:e2e:debug

# Run only desktop project
npx playwright test --project=chromium-desktop
```

### Viewing Reports

After CI runs, download the artifact:

```bash
# Local HTML report
npx playwright show-report
```

## Adding New Tests

### Unit Test Pattern

```ts
import { describe, it, expect, vi } from 'vitest';

// Mock external services in setup.ts or locally
vi.mock('some-module');

describe('Feature Name', () => {
  it('does something expected', async () => {
    const result = await someFunction();
    expect(result).toBe(true);
  });
});
```

### E2E Test Pattern

```ts
import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

test.describe('My Feature', () => {
  test('works as expected', async ({ page }) => {
    await page.goto('/my-page/');
    await waitForPageReady(page);
    await expect(page.locator('h1')).toHaveText('Expected Title');
  });
});
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Playwright browsers not found | `npm run playwright:install` |
| Port 4321 already in use | `lsof -ti:4321 | xargs kill -9` |
| E2E tests fail due to CSP | Tests run against `file://` if `http-server` fails; ensure `npm run build` succeeds first |
| Tests timeout on slow machine | Increase `navigationTimeout` in `playwright.config.ts` |
| Unit tests fail with module error | Ensure `vitest.config.ts` alias matches `tsconfig.json` paths |
