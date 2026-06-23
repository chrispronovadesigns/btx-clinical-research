# WordPress / Elementor to Astro Port Guide

A step-by-step template for migrating a bilingual WordPress/Elementor site into this Astro boilerplate. The goal is a 1:1 content port, preserving existing URLs, modernizing the UI, and keeping the site self-contained.

This guide is based on the Rio Grande Valley Content Hub (`riograndevalleyrgv.com`) migration, but the steps are generic enough to reuse for any similar site.

---

## 1. Pre-work checklist

Before writing any site code, confirm:

- [ ] Source site URL and WordPress REST API availability (`/wp-json/wp/v2/`).
- [ ] Domain and DNS access (Cloudflare, Vercel, or other registrar).
- [ ] Vercel team/account where the project will be hosted.
- [ ] Resend account for contact/newsletter forms.
- [ ] Cloudflare Turnstile account (optional, but recommended for bot protection).
- [ ] Whether the site is bilingual and how the original language URLs are structured (e.g., `/es/` sub-path, `?lang=es`, subdomain).
- [ ] Google Analytics ID if needed.

---

## 2. Scaffold the project

1. Copy the boilerplate to a new project directory.
2. Rename the project in `package.json` and update the description.
3. Update the site URL in `astro.config.mjs` and `src/lib/seo/config.ts`.
4. Run `npm install`.
5. Run `npm run build` and `npm run test` to verify the baseline is green.

---

## 3. Inventory the existing site

Document every page, post, category, and asset that must be migrated.

| Type | Examples | Notes |
|------|----------|-------|
| Pages | home, about, contact, privacy | Usually simple static pages. |
| Category archives | `/brownsville/`, `/south-padre-island/` | Recreate as static Astro pages. |
| Blog posts | `/hiring-.../`, `/things-to-do-.../` | Preserve original URLs at root or in `/es/`. |
| Media | hero images, inline post images, logos | Download locally into `public/images/`. |
| Forms | contact, newsletter | Map to `/api/contact` and `/api/waitlist`. |

---

## 4. URL strategy

**Default rule:** keep existing URLs exactly as they are. This avoids 301 redirects and preserves SEO.

- English posts should render at root: `src/pages/[slug].astro`.
- Spanish posts should render at `/es/`: `src/pages/es/[slug].astro`.
- Static pages should keep their original slugs, e.g., `/about-rio-grande-valley-content-hub/` and `/es/acerca-de/`.
- Category pages should keep their original slugs, e.g., `/brownsville/` and `/es/brownsville-es/`.

If a cleaner URL is preferred, add the new route **and** a `vercel.json` redirect from the old URL to the new one.

---

## 5. Branding and data updates

Update the following files with the new site identity:

| File | What to update |
|------|----------------|
| `src/data/site.ts` | Site name, phone, email, address, social links, nav labels. |
| `src/content/settings/global.json` | Site name, tagline, contact info, social links, SEO defaults. |
| `src/lib/seo/config.ts` | Site URL, organization info, services, area served. |
| `src/lib/seo/sitemap-config.ts` | Site URL and English-to-Spanish path mappings. |
| `public/manifest.json` | Site name, short name, description, theme colors. |
| `tailwind.config.ts` | Brand colors, gradients, shadows if needed. |
| `src/styles/global.css` | Brand CSS variables if needed. |
| `public/images/rgv-logo.png` / `public/images/rgv-hero.png` | Logo and hero images. |

---

## 6. Import content from WordPress

### 6.1 Fetch source data

Use the WordPress REST API to download the raw data:

```bash
WP=https://example.com

bash -c "curl -sL ${WP}/wp-json/wp/v2/posts?per_page=100 > rgv-wordpress-posts.json"
bash -c "curl -sL ${WP}/wp-json/wp/v2/pages?per_page=100 > rgv-wordpress-pages.json"
bash -c "curl -sL ${WP}/wp-json/wp/v2/media?per_page=100 > rgv-wordpress-media.json"
bash -c "curl -sL ${WP}/wp-json/wp/v2/categories?per_page=100 > rgv-wordpress-categories.json"
```

For Spanish content, use the WPML/translation plugin endpoint or fetch the `?lang=es` equivalent.

### 6.2 Convert HTML to Markdown

Use a one-time Node script (see `scripts/import-wordpress.js` in the RGV project for a reference) that:

1. Reads the JSON exports.
2. Strips Elementor classes, inline styles, scripts, and empty tags.
3. Converts HTML to Markdown using `turndown` + `turndown-plugin-gfm`.
4. Downloads images to `public/images/` and rewrites URLs to local paths.
5. Generates front matter for each post:

```yaml
---
title: "Post Title"
description: "Post excerpt"
publishedDate: 2024-06-12
author: "Author Name"
category: "Brownsville"
lang: "en"
alternateUrl: "/es/spanish-post-slug/"
heroImage: "/images/featured-image.png"
readingTime: "5 min read"
---
```

### 6.3 Place Markdown files

Write the converted files to:

- `src/content/blog/<english-slug>.md`
- `src/content/blog/<spanish-slug>.md`

Ensure the Spanish file has `lang: "es"` and `alternateUrl` pointing to the English version.

---

## 7. Create dynamic post routes

1. Remove the boilerplate `src/pages/blog/[slug].astro` if it exists.
2. Create `src/pages/[slug].astro` for English posts.
3. Create `src/pages/es/[slug].astro` for Spanish posts.
4. Both routes should:
   - Filter the `blog` collection by `lang`.
   - Render with `BlogLayout`.
   - Pass `enUrl` and `esUrl` for `hreflang` alternates.
   - Show related posts filtered by the same language.

Static pages (about, contact, categories) take precedence over dynamic routes, so there is no conflict.

---

## 8. Create static pages

For each page, create both English and Spanish versions.

| English | Spanish | File |
|---------|---------|------|
| `/` | `/es/` | `src/pages/index.astro` / `src/pages/es/index.astro` |
| `/about-.../` | `/es/acerca-de/` | `src/pages/about-....astro` / `src/pages/es/acerca-de.astro` |
| `/blog/` | `/es/blog/` | `src/pages/blog/index.astro` / `src/pages/es/blog.astro` |
| `/contact/` | `/es/contacte-con/` | `src/pages/contact.astro` / `src/pages/es/contacte-con.astro` |
| `/brownsville/` | `/es/brownsville-es/` | `src/pages/brownsville.astro` / `src/pages/es/brownsville-es.astro` |

Use `BaseLayout` and always pass `lang`, `enUrl`, and `esUrl`.

### 8.1 Category page component

Create a reusable `CategoryPage.astro` component that:

- Accepts a category name and translated copy.
- Filters posts from `getCollection('blog')` by category and language.
- Renders a hero, filtered grid, and a CTA/newsletter section.

---

## 9. Visual parity and design QA

After the pages and posts are structurally in place, compare the Astro output side-by-side with the original WordPress/Elementor site and tighten the design until it matches.

### 9.1 Capture the original

1. Open the live WordPress site at each critical URL (desktop and mobile).
2. Capture full-page screenshots or use a browser’s device toolbar for mobile.
3. Note the exact section order, spacing, typography, image treatments, and component styles.

### 9.2 Match page-by-page

For each page, align:

- **Typography:** heading sizes, font weights, line heights, and paragraph widths.
- **Spacing:** padding/margins between sections, containers, and grids.
- **Colors:** background colors, gradients, borders, and accent colors.
- **Images:** aspect ratios, object fit, borders, shadows, and lazy-loading behavior.
- **Components:** card styles, button shapes, badge styles, and hover states.
- **Layout:** column counts, responsive breakpoints, and max-widths.

### 9.3 Use shared components for repeated patterns

If the original site repeats the same pattern across pages (e.g., partner cards, newsletter boxes, category grids), extract it into a reusable component such as `CategoryPage.astro` or a custom `PartnerCard.astro` so the design stays consistent.

### 9.4 Handle Elementor-specific visual effects

- Strip or replace Elementor animations/scroll effects that do not translate to Astro/Tailwind unless the client wants them preserved.
- Replace Elementor icons with inline SVG or Heroicons to keep the site self-contained.
- Replace Elementor-specific widgets (e.g., image carousels, popups) with accessible Astro equivalents or remove them if they are not needed.

### 9.5 Visual QA checklist

- [ ] Hero section matches the original headline, subhead, CTA, and image placement.
- [ ] Latest articles / category grids match card image ratios, titles, excerpts, and dates.
- [ ] About page matches the original section order and partner presentation.
- [ ] Contact page matches the form fields, labels, and surrounding info.
- [ ] Footer matches the original logo, description, links, social icons, and copyright/credit.
- [ ] Mobile navigation and hamburger menu match the original behavior.
- [ ] Language switcher is placed and styled like the original.

---

## 10. Update forms and integrations

- Contact form: `src/components/ui/ContactForm.astro`.
- Newsletter form: `src/pages/index.astro` and `src/pages/about-...astro`.
- Both forms post to existing endpoints:
  - `/api/contact` (Resend + Turnstile)
  - `/api/waitlist` (Resend audience)
- Set the environment variables in production:
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
  - `CONTACT_EMAIL`
  - `RESEND_CONTACT_AUDIENCE_ID` (if using waitlist)
  - `PUBLIC_TURNSTILE_SITE_KEY`
  - `TURNSTILE_SECRET_KEY`

---

## 11. Update SEO and sitemap

1. Verify `src/lib/seo/sitemap-config.ts` maps English and Spanish paths correctly.
2. Ensure every static page passes `enUrl` and `esUrl` to `BaseLayout`.
3. Confirm the generated sitemap includes `hreflang` alternates and uses the correct site URL.
4. Set the canonical URL in `BaseLayout` to `https://example.com/<path>/`.

---

## 12. Update tests

1. Update `tests/e2e/helpers.ts` with the project’s critical paths.
2. Update `tests/e2e/navigation.spec.ts` and `tests/e2e/multilingual.spec.ts` with the correct nav labels and page pairs.
3. Update `tests/e2e/seo.spec.ts` with the correct site URL.
4. Run:
   - `npm run test`
   - `npm run playwright:install`
   - `npm run test:e2e`

Fix any strict-mode locator violations or stale URL references.

---

## 13. Build and verify

```bash
npm run build
npm run test
npx playwright test --project=chromium-desktop
```

Check the build output in `.vercel/output/static/` for:

- Correct page structure under each URL.
- Sitemap at `/sitemap-index.xml`.
- `robots.txt`, `manifest.json`, `sw.js`, and `offline.html`.

---

## 14. Deploy

1. Create a new Vercel project under the Pronova team.
2. Connect the GitHub repository.
3. Set all production environment variables.
4. Configure the custom domain in Vercel.
5. Update Cloudflare/DNS records to point to Vercel.
6. After launch, verify:
   - Contact form submissions.
   - Sitemap in Google Search Console.
   - `hreflang` alternates using an SEO tool.
   - No broken links (run the E2E suite against the live site).

---

## 15. Common pitfalls

- **URL changes break SEO.** Keep original slugs unless explicitly approved.
- **Duplicate content.** Do not serve the same post at both root and `/blog/`. Choose one canonical URL.
- **Missing Spanish mirror.** Every English page must have a matching `src/pages/es/` route.
- **Images deleted from WordPress.** Always download media locally and rewrite URLs.
- **Elementor shortcodes.** Strip them during import; convert to clean Markdown or Astro components.
- **Sitemap domain mismatch.** `src/lib/seo/sitemap-config.ts` must use the real production domain.

---

## 16. Reference file mapping

| RGV file | Purpose |
|----------|---------|
| `scripts/import-wordpress.js` | One-time WP import script (posts, media, front matter). |
| `src/pages/[slug].astro` | English dynamic post route. |
| `src/pages/es/[slug].astro` | Spanish dynamic post route. |
| `src/components/rgv/CategoryPage.astro` | Reusable category archive page. |
| `src/lib/seo/sitemap-config.ts` | Bilingual sitemap and URL mapping. |
| `src/data/site.ts` | Site metadata and nav. |

---

## 17. Checklist summary

- [ ] Inventory pages, posts, categories, media, forms, and integrations.
- [ ] Decide URL strategy (preserve existing URLs by default).
- [ ] Update brand data, colors, SEO, and manifest.
- [ ] Fetch WordPress data and download media.
- [ ] Convert HTML to Markdown and write to `src/content/blog/`.
- [ ] Create dynamic post routes at root and `/es/`.
- [ ] Create static English and Spanish pages.
- [ ] Match visual design and run design QA against the original site.
- [ ] Update forms and configure Resend/Turnstile env vars.
- [ ] Update E2E tests for the project’s paths and labels.
- [ ] Build, run tests, and deploy.
- [ ] Update DNS and verify post-launch.
