# AI Handoff — btx-clinical-research

**Last updated:** 2026-06-23 by Devin
**Convo thread:** /Users/migliorini-macbook/.local/share/devin/cli/summaries/history_82374bda67a34d1e.md
**Git HEAD:** main

---

## What this repo/project is

An English-only, single-page Astro website for BTX Clinical Research, a clinical research organization based in Brownsville, Texas. It replaces the previous WordPress/Elementor site at `btxclinicalresearch.com` and serves as the primary public-facing site.

---

## Architecture

- **Framework:** Astro 4 + Tailwind CSS 3 + Vercel serverless adapter.
- **Pages:** Only `src/pages/index.astro` (homepage) and `src/pages/privacy-policy.astro` exist. No blog, no Spanish pages, no service sub-pages.
- **Sections:** Hero, Mission & Vision, Core Values, Research Team, Site Capabilities, and Contact (with form). All are inline in `src/pages/index.astro`.
- **Forms:** `src/pages/api/contact.ts` handles submissions via Resend. The contact form is rendered by `src/components/ui/ContactForm.astro` and includes fields for Name, Email, Phone, Service, and Message.
- **SEO:** `src/lib/seo/config.ts` and `src/components/seo/SEOHead.astro` manage meta tags, Open Graph, and JSON-LD. The sitemap is generated at `.vercel/output/static/sitemap-index.xml`.
- **Brand:** Light medical theme using the original WordPress site's color palette:
  - Primary navy: `#172161`
  - Secondary teal-blue: `#1E5D7C`
  - Accent teal: `#2EAFA0`
  - Light background: `#F9FAFD`
  - Body font and headings: Poppins (Google Fonts).
  - Font Awesome icons loaded via CDN for the original icon set.
- **Assets:** Logo, building photos, team photos, and the medical team icon are in `public/images/`.

---

## Key decisions made

1. **English-only single-page site.** The client requested only the homepage, so the boilerplate's bilingual pages, blog, portfolio, and services were stripped.
2. **Port the original design.** The site is rebuilt to match the original WordPress/Elementor layout: light theme, full-width sections, top bar with address and phone, sticky header with logo and nav links, hero text + gallery, mission, values, team, capabilities, and contact form.
3. **Team page content inlined.** The research team bios from the original `/btx-clinical-research-medical-team/` WordPress page are displayed in the homepage Team section.
4. **Contact form matches original fields.** The form includes Name, Email, Phone, Service, and Message, and the submit button is labeled "Send" as on the original site.
5. **Contact form email target.** Submissions are sent to `info@btxclinicalresearch.com` via the `CONTACT_EMAIL` environment variable.
6. **WordPress redirects kept minimal.** The `/btx-clinical-research-medical-team/` path redirects to `/` because the team content is now on the homepage.

---

## Current state / live verification

- `npm run build` succeeds.
- `npm run test` passes (15 unit tests).
- `npm run test:e2e` passes (102 tests across chromium and webkit, desktop and mobile).
- Deployed to Vercel at:
  - `https://btx-clinical-research.vercel.app`
  - `https://btx-clinical-research-21lb4s8f1.vercel.app` (latest production deployment)
- GitHub repo: `https://github.com/chrispronovadesigns/btx-clinical-research`
- `btxclinicalresearch.com` has been added to the Vercel project as a custom domain but DNS must still be configured/verified.

---

## Known gaps / next steps

1. **Set live environment variables.** `CONTACT_EMAIL` and `RESEND_FROM_EMAIL` are set to `info@btxclinicalresearch.com`. The following still need real values in Vercel:
   - `RESEND_API_KEY`
   - `PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
   Without these, the contact form will return a server error when submitted.
2. **Verify Resend domain.** Ensure `info@btxclinicalresearch.com` (or the chosen `RESEND_FROM_EMAIL`) is a verified sending domain in Resend.
3. **Configure DNS for custom domain.** Point `btxclinicalresearch.com` to Vercel's DNS records. The Vercel project shows `btxclinicalresearch.com` as a pending domain.
4. **Optional image optimization.** The downloaded team and facility images are large; consider compressing them before final launch.
5. **Update Google Business Profile link.** The footer social link currently points to a generic Google search for the business; replace with the actual Google review URL when available.

---

## How to extend

- **Edit homepage content:** `src/pages/index.astro` — update the arrays for `values`, `team`, and `capabilities`, or change the text in the Mission/Contact sections.
- **Edit site data:** `src/data/site.ts` — phone, email, address, hours, nav links.
- **Edit SEO defaults:** `src/lib/seo/config.ts` and `src/content/settings/global.json`.
- **Edit colors:** `tailwind.config.ts` and `src/styles/global.css`.
- **Add a new page:** Create `src/pages/<page>.astro` and add it to the sitemap-config priority list if needed.
- **Add env vars:** Use `vercel env add <NAME> production` or the Vercel dashboard.

---

## Critical conventions

- **Do not add Spanish pages without explicit instruction.** The site is intentionally English-only.
- **Do not use `cd` for cross-repo work.** Use `bash -c 'cd /path && cmd'` from the locked session directory.
- **Do not upgrade `@astrojs/sitemap` to `^3.2.1` without also upgrading Astro to v5.** The pinned version avoids the `routes is undefined` build error.
- **Keep the site single-page unless asked.** The header nav anchors to `#mission`, `#values`, `#team`, `#capabilities`, and `#contact`.
- **Do not commit secrets.** API keys and Turnstile secrets must be set in Vercel, never in the repo.
