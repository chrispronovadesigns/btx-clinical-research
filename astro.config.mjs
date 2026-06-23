import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel/serverless';
import { serializeSitemapItem } from './src/lib/seo/sitemap-config';

export default defineConfig({
  site: 'https://btxclinicalresearch.com',
  output: 'hybrid',
  adapter: vercel(),
  integrations: [
    tailwind(),
    sitemap({
      filter: (page) =>
        !page.includes('/_examples/') &&
        !page.includes('/api/') &&
        !page.includes('/404'),
      serialize: serializeSitemapItem,
    }),
  ],
});
