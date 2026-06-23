# AI Handoff — pronova-astro-boilerplate

**Last updated:** 2026-06-22 by Devin
**Convo thread:** /Users/migliorini-macbook/.local/share/devin/cli/summaries/history_31541ad2f5664f21.md
**Git HEAD:** (not yet committed)

---

## What this repo/project is

A reusable, bilingual-ready Astro website boilerplate derived from the Pronova website. It is intended to be the starting point for new client sites: fast, SEO-ready, form-enabled, and easy to deploy to Vercel.

---

## Architecture

- **Framework:** Astro 4 + Tailwind CSS 3 + Vercel serverless adapter.
- **Bilingual:** English pages under `src/pages/`; Spanish pages under `src/pages/es/`. Components accept a `lang` prop.
- **Content:** Blog posts are Markdown in `src/content/blog/`. Portfolio, testimonials, and bio data are in `src/data/`.
- **Forms:** `src/pages/api/contact.ts` and `src/pages/api/waitlist.ts` handle submissions via Resend. Cloudflare Turnstile is optional (skippped if no site key).
- **Push:** `src/pages/api/push/subscribe.ts` and `src/pages/api/push/send.ts` plus `public/sw.js` provide PWA push notifications.
- **SEO:** `src/lib/seo/`, `SEOHead` component, and `src/lib/seo/sitemap-config.ts` handle JSON-LD, Open Graph, and sitemap alternates.

---

## Key decisions made

1. **Sitemap version pinned.** `@astrojs/sitemap` is pinned to `3.1.6` because `3.2.x` depends on the `astro:routes:resolved` hook introduced in Astro 5. The project stays on Astro 4.
2. **Pricing modal removed.** `PricingModal.astro` and `api/send-pricing.ts` were Pronova-specific and removed. They can be copied back from the original Pronova website if needed.
3. **Live chat removed.** The Crisp-dependent `openPronovaChat` function was removed. `Hero` and `CTABanner` now use generic contact links.
4. **Generic contact data.** Brand and contact info is centralized in `src/data/site.ts` and `src/content/settings/global.json` for easy customization.
5. **Placeholder content.** `src/data/portfolio.ts`, `src/data/testimonials.ts`, `src/data/bio.ts`, and `src/content/blog/example-post.md` contain placeholder examples that should be replaced per client.

---

## Current state / live verification

- `npm run build` succeeds.
- `npm run test` passes (33 unit tests).
- All pages are prerendered correctly.
- The sitemap is generated at `.vercel/output/static/sitemap-index.xml`.

---

## Known gaps / next steps

1. **Replace placeholder data.** Site name, contact info, brand colors, favicon, and manifest in the files listed below.
2. **Add real Spanish content.** The Spanish pages are structurally correct but still use translated placeholder text.
3. **Run E2E tests after installing Playwright.** `npm run playwright:install && npm run test:e2e` should be run once the boilerplate is ready.
4. **Add real icons.** `public/favicon.svg` exists, but a dedicated `apple-touch-icon` and PWA icon set would be better.
5. **Migrate the Rio Grande Valley RGV site.** The pilot rebuild plan is the next task after the boilerplate is approved.

---

## How to extend

- **New page:** Add `src/pages/new-page.astro` and `src/pages/es/new-page.astro`. Use `BaseLayout` and pass `enUrl`/`esUrl`.
- **New service page:** Use `ServiceLayout` and update `src/data/site.ts` nav if it should appear in the header.
- **New portfolio item:** Add an entry to `src/data/portfolio.ts`.
- **New blog post:** Add a Markdown file in `src/content/blog/` with the required front matter.
- **Forms:** Configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CONTACT_EMAIL`, and optionally `PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`.

---

## Critical conventions

- **Always mirror English and Spanish pages.** If a page is added in English, add the `es/` equivalent.
- **Do not use `cd` for cross-repo work.** Use `bash -c 'cd /path && cmd'` from the locked session directory.
- **Do not upgrade `@astrojs/sitemap` to `^3.2.1` without also upgrading Astro to v5.** The pinned version avoids the `routes is undefined` build error.
- **Pronova-specific branding should not be reintroduced.** The boilerplate is meant to be generic.
