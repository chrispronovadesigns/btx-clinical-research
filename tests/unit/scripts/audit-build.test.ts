import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * audit-build.mjs on tiny hand-built sites: each test writes a few html files, runs the real script and checks the
 * exit code (errors) and the report text (errors and warnings).
 */
const SITE = 'https://fixture.test';
const SCRIPT = path.resolve(__dirname, '../../../scripts/seo-plan/audit-build.mjs');
const dirs: string[] = [];

type LdNode = Record<string, unknown>;
interface PageOpts {
  url: string;
  title?: string;
  description?: string;
  lang?: string;
  noindex?: boolean;
  text?: string;
  ld?: LdNode[];
  hreflang?: Record<string, string>;
}

const business: LdNode = { '@context': 'https://schema.org', '@type': 'LocalBusiness', '@id': `${SITE}/#business`, name: 'Fixture Co' };
const crumbs: LdNode = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [] };
const DESC = 'A description for the fixture page that sits comfortably inside the seventy to one hundred sixty range.';

function html(o: PageOpts): string {
  const alternates = Object.entries(o.hreflang ?? {}).map(([l, h]) => `<link rel="alternate" hreflang="${l}" href="${h}">`).join('');
  const ld = (o.ld ?? [business]).map((n) => `<script type="application/ld+json">${JSON.stringify(n)}</script>`).join('');
  return `<!doctype html><html lang="${o.lang ?? 'en-US'}"><head><title>${o.title ?? `Title for ${o.url}`}</title>`
    + `<meta name="description" content="${o.description ?? `${DESC} ${o.url}`}">`
    + `${o.noindex ? '<meta name="robots" content="noindex">' : ''}`
    + `<link rel="canonical" href="${SITE}${o.url}">${alternates}${ld}</head>`
    + `<body><h1>Heading</h1><p>${o.text ?? 'Real copy written for this page.'}</p></body></html>`;
}

function site(pages: PageOpts[], vercelRedirects: { source: string; destination: string }[] = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-build-'));
  dirs.push(dir);
  for (const p of pages) {
    const file = p.url === '/' ? 'index.html' : `${p.url.replace(/^\//, '')}index.html`;
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), html(p));
  }
  const locs = pages.filter((p) => !p.noindex).map((p) => `<url><loc>${SITE}${p.url}</loc></url>`).join('');
  fs.writeFileSync(path.join(dir, 'sitemap-0.xml'), `<urlset>${locs}</urlset>`);
  fs.writeFileSync(path.join(dir, 'sitemap-index.xml'), `<sitemapindex><sitemap><loc>${SITE}/sitemap-0.xml</loc></sitemap></sitemapindex>`);
  fs.writeFileSync(path.join(dir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap-index.xml\n`);
  const vercel = path.join(dir, 'fixture-vercel.json');
  fs.writeFileSync(vercel, JSON.stringify({ redirects: vercelRedirects }));
  const r = spawnSync('node', [SCRIPT, dir], { env: { ...process.env, SITE_URL: SITE, VERCEL_JSON: vercel }, encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

const home: PageOpts = { url: '/' };
const about: PageOpts = { url: '/about/', ld: [business, crumbs] };

afterEach(() => {
  while (dirs.length) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe('audit-build: a clean fixture site', () => {
  it('passes with no errors', () => {
    const r = site([home, about]);
    expect(r.out).toContain('0 error(s)');
    expect(r.status).toBe(0);
  });
});

describe('audit-build: scaffold placeholder copy', () => {
  it('fails an indexable page that still carries scaffold copy', () => {
    const r = site([home, { ...about, text: 'Question one (from the SERP) Answer it honestly. Price $X,XXX' }]);
    expect(r.status).toBe(1);
    expect(r.out).toContain('scaffold placeholder copy on an indexable page');
  });

  it('allows the same copy on a noindex page', () => {
    const r = site([home, { ...about, noindex: true, text: 'Question one Feature one $X,XXX' }]);
    expect(r.status).toBe(0);
  });
});

describe('audit-build: redirects', () => {
  it('fails a built page that a vercel.json redirect shadows, and a sitemap that lists it', () => {
    const r = site([home, about], [{ source: '/about', destination: '/' }]);
    expect(r.status).toBe(1);
    expect(r.out).toContain('shadowed by a vercel.json redirect');
    expect(r.out).toContain('which vercel.json redirects to');
  });

  it('fails a redirect whose destination is not a built page, and a redirect chain', () => {
    const missing = site([home, about], [{ source: '/old/', destination: '/gone/' }]);
    expect(missing.status).toBe(1);
    expect(missing.out).toContain('lands on no built page');
    const chain = site([home, about], [{ source: '/old/', destination: '/older/' }, { source: '/older/', destination: '/about/' }]);
    expect(chain.status).toBe(1);
    expect(chain.out).toContain('lands on another redirect');
  });

  it('accepts a redirect that lands on a built page or a generated file', () => {
    const r = site([home, about], [{ source: '/old/', destination: '/about/' }, { source: '/sitemap.xml', destination: '/sitemap-index.xml' }]);
    expect(r.out).toContain('0 error(s)');
    expect(r.status).toBe(0);
  });

  it('ignores patterned and host-conditional redirects', () => {
    const r = site([home, about], [{ source: '/old/:slug', destination: '/' }, { source: '/about/', destination: '/', has: [{ type: 'host', value: 'www.fixture.test' }] } as never]);
    expect(r.status).toBe(0);
  });
});

describe('audit-build: business JSON-LD', () => {
  it('fails LocalBusiness nodes with different @ids on one page', () => {
    const second = { ...business, '@id': `${SITE}/#other` };
    const r = site([home, { ...about, ld: [business, second, crumbs] }]);
    expect(r.status).toBe(1);
    expect(r.out).toContain('2 different LocalBusiness @ids');
  });

  it('allows the same @id restated with page-specific details (one entity, described again)', () => {
    const restated = { ...business, areaServed: { '@type': 'City', name: 'Brownsville' } };
    const r = site([home, { ...about, ld: [business, restated, crumbs] }]);
    expect(r.out).toContain('0 error(s)');
    expect(r.status).toBe(0);
  });

  it('fails a LocalBusiness without an @id', () => {
    const { '@id': _id, ...noId } = business;
    const r = site([home, { ...about, ld: [noId, crumbs] }]);
    expect(r.status).toBe(1);
    expect(r.out).toContain('has no @id');
  });

  it('only warns about a lone Organization without an @id', () => {
    const org = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Fixture Co' };
    const r = site([home, { ...about, ld: [org, crumbs] }]);
    expect(r.status).toBe(0);
    expect(r.out).toContain('has no @id');
  });

  it('fails two businesses without an @id on one page', () => {
    const org = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Fixture Co' };
    const r = site([home, { ...about, ld: [org, { ...org, name: 'Other' }, crumbs] }]);
    expect(r.status).toBe(1);
  });

  it('warns about review markup on the site\'s own business but does not fail', () => {
    const review = { '@context': 'https://schema.org', '@type': 'Review', itemReviewed: { '@type': 'Organization', name: 'Fixture Co' }, reviewRating: { ratingValue: 5 } };
    const r = site([home, { ...about, ld: [business, review, crumbs] }]);
    expect(r.status).toBe(0);
    expect(r.out).toContain('no stars for self-published reviews');
  });

  it('warns when a non-home page has no BreadcrumbList', () => {
    const r = site([home, { ...about, ld: [business] }]);
    expect(r.status).toBe(0);
    expect(r.out).toContain('no BreadcrumbList JSON-LD');
  });
});

describe('audit-build: opening hours', () => {
  const hours = (h: string[]): LdNode => ({ ...business, openingHours: h });

  it('passes when every page states the same hours', () => {
    const r = site([{ ...home, ld: [hours(['Su-Fr 06:00-22:00', 'Sa 10:00-16:00'])] }, { ...about, ld: [hours(['Sa 10:00-16:00', 'Su-Fr 06:00-22:00']), crumbs] }]);
    expect(r.out).toContain('0 error(s)');
    expect(r.status).toBe(0);
  });

  it('fails a page whose hours differ from the rest of the site', () => {
    const same = hours(['Su-Fr 06:00-22:00']);
    const r = site([{ ...home, ld: [same] }, { ...about, ld: [same, crumbs] }, { url: '/team/', ld: [hours(['Mo-Fr 09:00-17:00']), crumbs] }]);
    expect(r.status).toBe(1);
    expect(r.out).toContain('differ from the rest of the site');
  });

  it('fails one page that states two different sets of hours', () => {
    const r = site([home, { ...about, ld: [hours(['Su-Fr 06:00-22:00']), hours(['Mo-Fr 09:00-17:00']), crumbs] }]);
    expect(r.status).toBe(1);
    expect(r.out).toContain('2 different sets of opening hours');
  });

  it('compares openingHoursSpecification the same way', () => {
    const spec = (opens: string): LdNode => ({ ...business, openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday'], opens, closes: '17:00' }] });
    const r = site([{ ...home, ld: [spec('09:00')] }, { ...about, ld: [spec('09:00'), crumbs] }, { url: '/team/', ld: [spec('10:00'), crumbs] }]);
    expect(r.status).toBe(1);
    expect(r.out).toContain('differ from the rest of the site');
  });
});

describe('audit-build: image alt', () => {
  it('accepts a bare alt attribute (how Astro prints alt="") and fails a missing one', () => {
    const ok = site([home, { ...about, text: '<img src="/a.webp" alt loading="lazy">' }]);
    expect(ok.status).toBe(0);
    const bad = site([home, { ...about, text: '<img src="/a.webp" data-alt="x">' }]);
    expect(bad.status).toBe(1);
    expect(bad.out).toContain('<img> without alt');
  });
});

describe('audit-build: page language', () => {
  it('accepts a bare language code or a regional one', () => {
    const r = site([{ ...home, lang: 'en' }, { ...about, lang: 'en-US' }]);
    expect(r.status).toBe(0);
  });

  it('holds a page to the language its own hreflang names (a Spanish page at a legacy root URL)', () => {
    const hreflang = { en: `${SITE}/`, es: `${SITE}/terapia/`, 'x-default': `${SITE}/` };
    const ok = site([{ ...home, hreflang }, { url: '/terapia/', lang: 'es-MX', hreflang, ld: [business, crumbs] }]);
    expect(ok.status).toBe(0);
    const bad = site([{ ...home, hreflang }, { url: '/terapia/', lang: 'en', hreflang, ld: [business, crumbs] }]);
    expect(bad.status).toBe(1);
    expect(bad.out).toContain('<html lang="en"> but the URL is es');
  });

  it('fails an /es/ page that declares English', () => {
    const r = site([home, about, { url: '/es/', lang: 'en-US', ld: [business, crumbs] }]);
    expect(r.status).toBe(1);
    expect(r.out).toContain('<html lang="en-US"> but the URL is es');
  });
});

describe('audit-build: duplicates and hreflang coverage', () => {
  it('warns about the same title on two indexable pages', () => {
    const r = site([home, { ...about, title: 'Same title' }, { url: '/team/', title: 'Same title', ld: [business, crumbs] }]);
    expect(r.status).toBe(0);
    expect(r.out).toContain('same title on 2 indexable pages');
  });

  it('warns about an indexable page with no hreflang on a bilingual site', () => {
    const en = { url: '/', hreflang: { en: `${SITE}/`, es: `${SITE}/es/`, 'x-default': `${SITE}/` } };
    const es = { url: '/es/', lang: 'es-US', hreflang: { en: `${SITE}/`, es: `${SITE}/es/`, 'x-default': `${SITE}/` } };
    const r = site([en, es, about]);
    expect(r.status).toBe(0);
    expect(r.out).toContain('no hreflang set on a bilingual site');
  });
});
