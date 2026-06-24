# AI Handoff — btx-clinical-research

**Last updated:** 2026-06-24 by Devin
**Convo thread:** /Users/migliorini-macbook/.local/share/devin/cli/summaries/history_25d290c72bc74fbb.md
**Git HEAD:** (local changes not yet pushed)

---

## What this repo/project is

An English-only, single-page Astro website for BTX Clinical Research, a clinical research organization based in Brownsville, Texas. It replaces the previous WordPress/Elementor site at `btxclinicalresearch.com` and serves as the primary public-facing site.

---

## Architecture

- **Framework:** Astro 4 + Tailwind CSS 3 + Vercel serverless adapter.
- **Pages:** Only `src/pages/index.astro` (homepage) and `src/pages/privacy-policy.astro` exist. No blog, no Spanish pages, no service sub-pages.
- **Sections:** Hero, Mission & Vision, Core Values, Research Team, Site Capabilities, and Contact (with form). All homepage content is inline in `src/pages/index.astro`.
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
3. **Contact section moved into the footer.** The original WordPress site places the "Get in contact with us today!" CTA and form inside the footer, above the main footer links. The Astro site mirrors that structure.
4. **Footer matches the original.** The footer now has a light background, the original "Get In Touch" block, a "Review Us on Google" link, and a teal bottom bar with "© 2025 All Rights Reserved. BTX Clinical Research" and the "Developed by Pronova Designs" credits.
5. **Team content matches original titles.** Andre Rosas is listed as "Co-owner/Medical director", Rosa Rosas as "CEO/Founder", and Jared Parkin/Etienne Rosas have no subtitle (matching the original layout).
6. **Capability flip cards match original colors.** The front of each flip card is navy with a white icon, and the back is teal with white text — the same color scheme as the original Elementor flip boxes.
7. **WordPress redirects kept minimal.** The `/btx-clinical-research-medical-team/` path redirects to `/` because the team content is now on the homepage.

---

## Current state / live verification

- `npm run build` succeeds.
- `npm run test` passes (15 unit tests).
- `npm run test:e2e` passes (102 tests across chromium and webkit, desktop and mobile).
- `npm run test:all` passes.
- GitHub repo: `https://github.com/chrispronovadesigns/btx-clinical-research`
- Vercel project: `christopher-a-migliorinis-projects/btx-clinical-research`
- **Deployment status:** Local changes are ready to push. The Vercel project is linked to the GitHub `main` branch and will auto-deploy on push.
- `btxclinicalresearch.com` has been added to the Vercel project as a custom domain but DNS must still be configured/verified.

---

## Known gaps / next steps

1. **Push the local changes to GitHub.** This will trigger the Vercel production deployment.
2. **Set live environment variables.** `CONTACT_EMAIL` and `RESEND_FROM_EMAIL` are set to `info@btxclinicalresearch.com`. The following still need real values in Vercel:
   - `RESEND_API_KEY`
   - `PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
   Without these, the contact form will return a server error when submitted.
3. **Verify Resend domain.** Ensure `info@btxclinicalresearch.com` (or the chosen `RESEND_FROM_EMAIL`) is a verified sending domain in Resend.
4. **Configure DNS for custom domain.** Point `btxclinicalresearch.com` to Vercel's DNS records. The Vercel project shows `btxclinicalresearch.com` as a pending domain.
5. **Optional image optimization.** The downloaded team and facility images are large; consider compressing them before final launch.
6. **Update Google Business Profile link.** The "Review Us on Google" link currently points to a generic Google search; replace with the actual Google review URL when available.

---

## How to extend

- **Edit homepage content:** `src/pages/index.astro` — update the arrays for `values`, `team`, and `capabilities`, or change the text in the Mission/Contact sections.
- **Edit footer layout:** `src/components/layout/Footer.astro` — contains the contact CTA, form, main footer links, and bottom bar.
- **Edit site data:** `src/data/site.ts` — phone, email, address, hours, nav links, and the Google review link.
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
