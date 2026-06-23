import type { SitemapItem } from '@astrojs/sitemap';

const SITE = 'https://btxclinicalresearch.com';

type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

function getPriority(path: string): number {
  if (path === '/') return 1.0;
  if (path === '/privacy-policy') return 0.3;
  return 0.5;
}

function getChangeFreq(path: string): ChangeFreq {
  if (path === '/') return 'weekly';
  if (path === '/privacy-policy') return 'yearly';
  return 'monthly';
}

function urlToPath(url: string): string {
  return new URL(url).pathname.replace(/\/$/, '') || '/';
}

export function toCanonicalUrl(path: string): string {
  return path === '/' ? `${SITE}/` : `${SITE}${path}/`;
}

export function serializeSitemapItem(item: SitemapItem): SitemapItem {
  const path = urlToPath(item.url);

  item.priority = getPriority(path);
  item.changefreq = getChangeFreq(path);
  item.lastmod = new Date();

  return item;
}
