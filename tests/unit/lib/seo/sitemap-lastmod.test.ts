import { describe, it, expect } from 'vitest';
import { serializeSitemapItem, attributionFilesFor, resolveLastmod } from '@/lib/seo/sitemap-config';

const SITE = 'https://btxclinicalresearch.com';
const entry = (p: string) => serializeSitemapItem({ url: `${SITE}${p}` } as any);

describe('sitemap lastmod', () => {
  it('attributes every page to files that exist', () => {
    for (const p of ['/', '/privacy-policy/']) {
      expect(attributionFilesFor(p).length, p).toBeGreaterThan(0);
    }
  });

  it('attributes a page to its own file and its imports', () => {
    const files = attributionFilesFor('/privacy-policy/');
    expect(files).toContain('src/pages/privacy-policy.astro');
  });

  it('resolves the newest dated file', () => {
    expect(resolveLastmod('/privacy-policy/', {
      'src/pages/privacy-policy.astro': '2026-10-31T10:00:00Z',
      'src/layouts/BaseLayout.astro': '2026-11-01T10:00:00Z',
    })).toBe('2026-11-01T10:00:00Z');
  });

  it('omits lastmod rather than inventing one when nothing is dated', () => {
    expect(resolveLastmod('/privacy-policy/', {})).toBeUndefined();
  });
});
