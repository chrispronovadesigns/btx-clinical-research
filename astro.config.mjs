import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { serializeSitemapItem, isNoindexPage } from './src/lib/seo/sitemap-config';

export default defineConfig({
  // Astro 5+ strips whitespace between template expressions (`© {year}` newline `{rights}` renders as
  // \"© 2026Acme\"). Keep Astro 4's whitespace; it is negligible after gzip.
  compressHTML: false,
  vite: { plugins: [tailwindcss()] },
  site: 'https://btxclinicalresearch.com',
  output: 'static',
  adapter: vercel(),
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/_examples/') &&
        !page.includes('/api/') &&
        !page.includes('/404') &&
        !isNoindexPage(page),
      serialize: serializeSitemapItem,
    }),
  ],
});
