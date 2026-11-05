import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Guards the redirect map in vercel.json (old WordPress URLs, a previous domain's pages, renamed pages).
 * Every literal destination must be a page that exists, no destination may itself redirect (no chains),
 * no literal source may be a page that still ships, and every rule keeps both its slash and non-slash form.
 * With an empty map the checks pass trivially, so the guard is on from day one.
 */
const ROOT = path.resolve(__dirname, '../../..');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')) as {
  redirects?: { source: string; destination: string; has?: unknown }[];
};
const redirects = config.redirects ?? [];

const norm = (p: string) => (p.endsWith('/') ? p : `${p}/`);
const clean = (p: string) => p.split('#')[0].split('?')[0];
const isPattern = (p: string) => /[:*(]/.test(p);

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(astro|md|mdx)$/.test(e.name)) out.push(full);
  }
  return out;
}

/** Static routes from src/pages, plus a regex per dynamic route ([slug], [...rest]). */
function routes(): { pages: Set<string>; dynamic: RegExp[] } {
  const pages = new Set<string>(['/']);
  const dynamic: RegExp[] = [];
  const base = path.join(ROOT, 'src/pages');
  if (!fs.existsSync(base)) return { pages, dynamic };
  for (const f of walk(base)) {
    let rel = path.relative(base, f).split(path.sep).join('/').replace(/\.(astro|md|mdx)$/, '');
    if (rel.startsWith('api/')) continue;
    rel = rel.replace(/(^|\/)index$/, '');
    if (rel.includes('[')) {
      const source = rel.split('/').map((seg) => (/^\[\.\.\..+\]$/.test(seg) ? '.+' : /\[.+\]/.test(seg) ? '[^/]+' : seg.replace(/[.*+?^${}()|\\]/g, '\\$&'))).join('/');
      dynamic.push(new RegExp(`^/${source}/$`));
    } else pages.add(norm(`/${rel}`));
  }
  return { pages, dynamic };
}

const { pages, dynamic } = routes();
const exists = (p: string) => pages.has(norm(p)) || dynamic.some((re) => re.test(norm(p)));
const literal = redirects.filter((r) => !r.has && !isPattern(r.source));
const sources = new Set(redirects.map((r) => norm(r.source)));
const rawSources = new Set(redirects.map((r) => r.source));
const literalDest = redirects.filter((r) => !isPattern(r.destination) && !r.destination.startsWith('http'));

describe('vercel.json redirects', () => {
  it('every literal destination is a page or a public file that exists (no 404 at the end of a redirect)', () => {
    const missing = literalDest
      .map((r) => ({ source: r.source, destination: clean(r.destination) }))
      // XML sitemaps are generated at build time rather than kept in public/.
      .filter((r) => !/^\/sitemap[-_a-z0-9]*\.xml$/i.test(r.destination))
      .filter((r) => (/\.[a-z0-9]+$/i.test(r.destination) ? !fs.existsSync(path.join(ROOT, 'public', r.destination)) : !exists(r.destination)))
      .map((r) => `${r.source} -> ${r.destination}`);
    expect(missing).toEqual([]);
  });

  it('no destination is itself redirected (no chains)', () => {
    const chains = literalDest
      .filter((r) => sources.has(norm(clean(r.destination))) && norm(clean(r.destination)) !== norm(r.source))
      .map((r) => `${r.source} -> ${r.destination}`);
    expect(chains).toEqual([]);
  });

  it('no literal source is a page that still ships', () => {
    expect(literal.filter((r) => pages.has(norm(r.source))).map((r) => r.source)).toEqual([]);
  });

  it('keeps both the slash and the non-slash form of each literal rule', () => {
    const lone = literal.filter((r) => r.source !== '/' && r.source.endsWith('/') && !rawSources.has(r.source.replace(/\/$/, ''))).map((r) => r.source);
    expect(lone).toEqual([]);
  });
});
