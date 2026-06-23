# BTX Clinical Research

An English-only, single-page website for BTX Clinical Research, rebuilt from the Pronova Astro boilerplate. It deploys to Vercel and uses Resend + Cloudflare Turnstile for the contact form.

## Stack

- **Astro 4** — static-first with serverless functions
- **Tailwind CSS 3** — utility-first styling
- **Vercel** — hosting + serverless adapter
- **Resend** — contact form emails
- **Cloudflare Turnstile** — bot protection
- **Playwright + Vitest** — tests

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in real values:

   ```bash
   cp .env.example .env.local
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

## Content updates

- **Site data:** `src/data/site.ts` — name, contact info, navigation, social links
- **SEO defaults:** `src/lib/seo/config.ts` and `src/content/settings/global.json`
- **Homepage:** `src/pages/index.astro` — hero, mission, values, team, capabilities, contact
- **Privacy policy:** `src/pages/privacy-policy.astro`
- **Brand assets:** `public/images/btx-logo.png`, `public/images/btx-building.jpg`, `public/favicon.svg`, `public/manifest.json`
- **Colors:** `tailwind.config.ts` and `src/styles/global.css`
- **Redirects:** `vercel.json` — add WordPress migration paths if needed

## Forms

Contact form submissions POST to `src/pages/api/contact.ts`. Configure the following environment variables in Vercel:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (must be a verified Resend domain)
- `CONTACT_EMAIL` (receives submissions; default is `info@btxclinicalresearch.com`)
- `PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

## Deployment

Connect the GitHub repo to a Vercel project named `btx-clinical-research` and set the environment variables above.

```bash
npm run build
```

The postbuild script patches the Vercel function runtime to Node 20.

## Testing

```bash
npm run test
npm run test:e2e
```

To run both unit and E2E tests:

```bash
npm run test:all
```

## Useful patterns

- **Hero / CTA:** `Hero` and `CTABanner` components in `src/components/sections/`
- **SEO:** `SEOHead` component + schema builders in `src/lib/seo/schema.ts`
- **Forms:** `ContactForm` in `src/components/ui/ContactForm.astro`
