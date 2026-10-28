import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { serializeSitemapItem } from './src/lib/seo/sitemap-config';

export default defineConfig({
  // Astro 5+ strips whitespace between template expressions (`© {year}` newline `{rights}` renders as
  // \"© 2026Acme\"). Keep Astro 4's whitespace; it is negligible after gzip.
  compressHTML: false,
  site: 'https://btxclinicalresearch.com',
  output: 'static',
  adapter: vercel(),
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/_examples/') &&
        !page.includes('/api/') &&
        !page.includes('/404'),
      serialize: serializeSitemapItem,
    }),
  ],
});
