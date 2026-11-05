#!/usr/bin/env node
/**
 * seo-plan audit-build — checks the BUILT html, i.e. what Google actually fetches.
 *
 * verify.mjs reads the page SOURCE files and the plan CSV, so it cannot see render-time
 * bugs: JSON-LD that is not valid JSON, a canonical built from an unfilled config, an ES
 * page rendered with lang="en", one-way hreflang, a noindex prop that a layout dropped,
 * a nav link that 404s. This script reads the output of `npm run build` instead.
 *
 * Errors (exit 1), per INDEXABLE page unless noted:
 *   - JSON-LD blocks that do not parse (every page)
 *   - missing <title> / meta description / canonical, or a canonical that is not this page's own absolute URL
 *   - not exactly one <h1>
 *   - <html lang> that does not match the URL (/es/ -> es-US, else en-US)
 *   - hreflang that is not self-referencing and reciprocal, or lacks x-default
 *   - any "TODO" left in the page (a placeholder must be noindex until its copy is final)
 *   - scaffold placeholder copy ("Question one", "$X,XXX", ... see placeholders.mjs) on an indexable page
 *   - a page that is built AND shadowed by a vercel.json redirect (the sitemap/hreflang then point at a 308)
 *   - LocalBusiness nodes with different @ids on a page, or a LocalBusiness/Organization without an @id
 *   - internal links that resolve to nothing, <img> without alt
 *   - the sitemap listing a noindex/404/unbuilt/redirected page, or omitting an indexable one
 *   - anything in the output shaped like a secret (Square/Stripe/AWS/GitHub tokens, private keys), every file type
 * Warnings: title > 60 chars, description outside 70-160 chars, the same title or description on two indexable
 *   pages, an indexable page with no hreflang on a bilingual site, no BreadcrumbList on a non-home page, an
 *   Organization AND a LocalBusiness with different @ids, review/aggregateRating markup on the site's own business
 *   (Google shows no stars for self-published reviews).
 *
 * Run: npm run build && node scripts/seo-plan/audit-build.mjs [outputDir]
 * Env: SITE_URL overrides the site URL (fixtures, previews).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLACEHOLDER_SENTINELS } from './placeholders.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = process.argv[2]
  ? path.resolve(process.argv[2])
  : ['dist', '.vercel/output/static'].map((d) => path.join(ROOT, d)).find((d) => fs.existsSync(d));
if (!OUT || !fs.existsSync(OUT)) {
  console.error('no build output found: run `npm run build` first (or pass the output directory)');
  process.exit(2);
}

// The site URL comes from seo-plan.config.json; a site without one (a ported site that predates the
// seo-plan model) can pass SITE_URL or fall back to the `site:` in astro.config.mjs.
const configPath = path.join(ROOT, 'seo-plan.config.json');
const configUrl = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')).siteUrl : undefined;
const astroUrl = ['astro.config.mjs', 'astro.config.ts'].map((f) => path.join(ROOT, f)).filter((f) => fs.existsSync(f))
  .map((f) => fs.readFileSync(f, 'utf8').match(/\bsite:\s*['"]([^'"]+)['"]/)?.[1]).find(Boolean);
const rawUrl = process.env.SITE_URL || configUrl || astroUrl;
if (!rawUrl) {
  console.error('no site URL: add seo-plan.config.json, set SITE_URL, or set `site` in astro.config.mjs');
  process.exit(2);
}
const SITE = (String(rawUrl).startsWith('TODO') ? 'https://example.com' : rawUrl).replace(/\/+$/, '');

// ---- collect pages -------------------------------------------------------
const pages = new Map(); // url path -> { file, html }
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full); continue; }
    if (!e.name.endsWith('.html')) continue;
    const rel = path.relative(OUT, full).split(path.sep).join('/');
    const url = rel === 'index.html' ? '/' : rel.endsWith('/index.html') ? `/${rel.slice(0, -'index.html'.length)}` : `/${rel}`;
    pages.set(url, { file: rel, html: fs.readFileSync(full, 'utf8') });
  }
})(OUT);

const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)].map((m) => [m[1].toLowerCase(), m[2]]));
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((m) => attrs(m[0]));
const body = (html) => html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');

const errors = []; // [url, message]
const warnings = [];
const err = (url, msg) => errors.push([url, msg]);
// Opening hours stated in JSON-LD, per page: a site has one set of hours, so every page that states hours must agree.
const hoursByPage = new Map();
const hoursSignature = (n) => {
  const days = (d) => [].concat(d ?? []).map((x) => String(x).split('/').pop()).sort().join(',');
  const specs = [].concat(n.openingHoursSpecification ?? []).map((o) => `${days(o.dayOfWeek)} ${o.opens ?? ''}-${o.closes ?? ''}`);
  return [...[].concat(n.openingHours ?? []).map((h) => String(h).trim()), ...specs].sort().join(' | ');
};
const warn = (url, msg) => warnings.push([url, msg]);

const exists = (p) => fs.existsSync(path.join(OUT, p));
const resolves = (href) => {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean || clean === '/') return pages.has('/');
  if (/\.[a-z0-9]+$/i.test(clean)) return exists(clean.replace(/^\//, ''));
  const dir = clean.endsWith('/') ? clean : `${clean}/`;
  return pages.has(dir);
};

// Length is measured on what a searcher sees: "&quot;" is one character, not six.
const decode = (t) => t.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// vercel.json redirect sources as page paths ("/old" and "/old/" both -> "/old/"). Patterned sources
// (":slug", "*", "(") and host-conditional ones are skipped: only a literal path can shadow a built page.
const redirectSources = new Map();
try {
  const vj = JSON.parse(fs.readFileSync(process.env.VERCEL_JSON || path.join(ROOT, 'vercel.json'), 'utf8'));
  for (const r of vj.redirects ?? []) {
    if (!r?.source || r.has || /[:*(]/.test(r.source)) continue;
    redirectSources.set(r.source.replace(/\/?$/, '/'), r.destination);
  }
} catch { /* no vercel.json: nothing to cross-check */ }

// Top-level JSON-LD nodes of a page (flattens @graph and arrays).
const typesOf = (n) => [].concat(n?.['@type'] ?? []);
const ldNodes = (html) => {
  const out = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let data;
    try { data = JSON.parse(m[1]); } catch { continue; } // invalid blocks are reported by the per-page loop
    for (const n of Array.isArray(data) ? data : [data]) {
      if (n?.['@graph']) out.push(...n['@graph']);
      else if (n) out.push(n);
    }
  }
  return out;
};
const isBusiness = (n) => typesOf(n).some((t) => t === 'LocalBusiness' || t === 'Organization');

const info = new Map();
for (const [url, { html }] of pages) {
  const meta = Object.fromEntries(tags(html, 'meta').filter((m) => m.name).map((m) => [m.name.toLowerCase(), m.content]));
  const robots = (meta.robots ?? '').toLowerCase();
  const is404 = url === '/404.html';
  info.set(url, {
    is404,
    noindex: robots.includes('noindex'),
    title: decode((html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim()),
    description: decode(meta.description ?? ''),
    canonicals: tags(html, 'link').filter((l) => l.rel === 'canonical').map((l) => l.href),
    hreflang: tags(html, 'link').filter((l) => l.rel === 'alternate' && l.hreflang),
    lang: html.match(/<html[^>]*\blang="([^"]*)"/i)?.[1] ?? '',
    h1s: (body(html).match(/<h1[\s>]/gi) ?? []).length,
  });
}

const bilingual = [...info.values()].some((i) => i.hreflang.length);

// ---- per-page checks -------------------------------------------------------
for (const [url, { html }] of pages) {
  const i = info.get(url);

  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); }
    catch { err(url, `invalid JSON-LD (not parseable): ${m[1].trim().replace(/\s+/g, ' ').slice(0, 70)}...`); }
  }
  if (i.is404) continue;

  for (const c of i.canonicals) if (/todo/i.test(c)) err(url, `canonical contains TODO: ${c}`);
  for (const h of i.hreflang) if (/todo/i.test(h.href)) err(url, `hreflang contains TODO: ${h.href}`);
  if (i.noindex) continue; // placeholders, thank-you pages etc. are only held to the JSON-LD rule above

  if (!i.title) err(url, 'missing <title>');
  else if (i.title.length > 60) warn(url, `title is ${i.title.length} chars (>60 truncates in results)`);
  if (!i.description) err(url, 'missing meta description');
  else if (i.description.length < 70 || i.description.length > 160) warn(url, `description is ${i.description.length} chars (aim 70-160)`);

  if (i.canonicals.length !== 1) err(url, `${i.canonicals.length} canonical tags (need exactly 1)`);
  else if (i.canonicals[0] !== `${SITE}${url}`) err(url, `canonical ${i.canonicals[0]} is not the page's own URL ${SITE}${url}`);

  if (i.h1s !== 1) err(url, `${i.h1s} <h1> elements (need exactly 1)`);

  // The language must match the URL; the region ("en" vs "en-US") is a house convention, not a defect.
  // A page that names its own language in hreflang is held to that (a Spanish page kept at an English-looking legacy
  // URL is fine); otherwise the /es/ prefix decides.
  const selfHreflang = i.hreflang.find((h) => h.href === `${SITE}${url}` && h.hreflang !== 'x-default');
  const wantLang = selfHreflang ? selfHreflang.hreflang.toLowerCase().split('-')[0] : url === '/es/' || url.startsWith('/es/') ? 'es' : 'en';
  if (String(i.lang ?? '').toLowerCase().split('-')[0] !== wantLang) err(url, `<html lang="${i.lang}"> but the URL is ${wantLang}`);

  if (i.hreflang.length) {
    const set = Object.fromEntries(i.hreflang.map((h) => [h.hreflang, h.href]));
    if (!set['x-default']) err(url, 'hreflang set has no x-default');
    if (!Object.values(set).includes(`${SITE}${url}`)) err(url, 'hreflang set does not reference the page itself');
    for (const [lang, href] of Object.entries(set)) {
      if (lang === 'x-default' || href === `${SITE}${url}`) continue;
      const twin = info.get(href.replace(SITE, ''));
      if (!twin) err(url, `hreflang ${lang} -> ${href} is not a built page`);
      else if (!twin.hreflang.some((h) => h.href === `${SITE}${url}`)) err(url, `hreflang ${lang} -> ${href} does not link back (non-reciprocal annotations are ignored)`);
    }
  }

  else if (bilingual) warn(url, 'no hreflang set on a bilingual site (a page with an ES twin needs the pair, with x-default)');

  if (/TODO/.test(body(html))) err(url, 'contains "TODO" placeholder text: finish the copy or mark the page noindex');

  // The scaffold's own copy, not just the word TODO: an older scaffold (or a removed `noindex`) otherwise
  // publishes "Question one" and "$X,XXX" with nothing to stop it.
  const leftover = PLACEHOLDER_SENTINELS.filter((s) => body(html).includes(s));
  if (leftover.length) err(url, `scaffold placeholder copy on an indexable page (${leftover.map((s) => `"${s}"`).join(', ')}): write the real copy, or keep the page noindex`);

  if (redirectSources.has(url)) err(url, `built page is shadowed by a vercel.json redirect to ${redirectSources.get(url)}: delete the page (and its sitemap/hreflang entries) or the redirect`);

  const nodes = ldNodes(html);
  // The same @id repeated is ONE entity (a page may restate it with its own areaServed); different @ids are two businesses.
  const lbIds = new Set(nodes.filter((n) => typesOf(n).includes('LocalBusiness') && n['@id']).map((n) => n['@id']));
  if (lbIds.size > 1) err(url, `${lbIds.size} different LocalBusiness @ids in JSON-LD (${[...lbIds].join(', ')}): one business needs one @id`);
  // A LocalBusiness without an @id is an error (it is the entity that must stay one). A lone Organization without one is
  // only a warning: nothing can duplicate it, it just cannot be referenced from other nodes.
  const noId = nodes.filter(isBusiness).filter((n) => !n['@id']);
  for (const n of noId) {
    const msg = `${typesOf(n).join('/')} JSON-LD has no @id, so it cannot be referenced and duplicates cannot be told apart`;
    if (typesOf(n).includes('LocalBusiness') || noId.length > 1) err(url, msg);
    else warn(url, msg);
  }
  const businessIds = new Set(nodes.filter((n) => isBusiness(n) && n['@id']).map((n) => n['@id']));
  if (businessIds.size > 1) warn(url, `${businessIds.size} business entities (${[...businessIds].join(', ')}): use one @id for the business`);
  const sigs = new Set(nodes.filter((n) => isBusiness(n) && (n.openingHours || n.openingHoursSpecification)).map(hoursSignature).filter(Boolean));
  if (sigs.size > 1) err(url, `${sigs.size} different sets of opening hours in JSON-LD on one page (${[...sigs].join(' ;; ')}): a business has one set of hours`);
  else if (sigs.size === 1) hoursByPage.set(url, [...sigs][0]);
  const reviewsBusiness = (n) => [].concat(n.itemReviewed ?? []).some((r) => typesOf(r).some((t) => t === 'Organization' || t === 'LocalBusiness'));
  if (nodes.some((n) => (typesOf(n).some((t) => t === 'Review' || t === 'AggregateRating') && reviewsBusiness(n)) || (isBusiness(n) && (n.aggregateRating || n.review)))) {
    warn(url, 'review/aggregateRating markup on the site\'s own business: Google shows no stars for self-published reviews (keep the testimonials as visible content)');
  }
  if (url !== '/' && url !== '/es/' && !nodes.some((n) => typesOf(n).includes('BreadcrumbList'))) warn(url, 'no BreadcrumbList JSON-LD');

  for (const m of body(html).matchAll(/<img\b[^>]*>/gi)) if (!/\salt(?=[\s=/>])/.test(m[0])) err(url, `<img> without alt: ${m[0].slice(0, 60)}`);

  const broken = new Set();
  for (const a of tags(body(html), 'a')) {
    const href = a.href ?? '';
    if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/_astro') || href.startsWith('/api/')) continue;
    if (!resolves(href)) broken.add(href);
  }
  for (const href of broken) err(url, `broken internal link: ${href}`);
}

// ---- redirect destinations land on built pages ----------------------------
for (const [from, to] of redirectSources) {
  if (!to.startsWith('/') || /[:*(]/.test(to)) continue;
  const target = to.split('#')[0].split('?')[0].replace(/\/?$/, '/');
  if (redirectSources.has(target) && target !== from) err('/vercel.json', `redirect ${from} -> ${to} lands on another redirect (a chain: point it at the final page)`);
  else if (!resolves(to)) err('/vercel.json', `redirect ${from} -> ${to} lands on no built page or file (a 404 at the end of a redirect)`);
}

// ---- duplicates across pages ----------------------------------------------
for (const field of ['title', 'description']) {
  const seen = new Map();
  for (const [url, i] of info) {
    if (i.noindex || i.is404 || !i[field]) continue;
    seen.set(i[field], [...(seen.get(i[field]) ?? []), url]);
  }
  for (const [value, urls] of seen) {
    if (urls.length > 1) warn(urls[0], `same ${field} on ${urls.length} indexable pages (${urls.slice(0, 4).join(', ')}): "${value.slice(0, 60)}"`);
  }
}

// ---- opening hours must agree across the site ----------------------------
{
  const counts = new Map();
  for (const sig of hoursByPage.values()) counts.set(sig, (counts.get(sig) ?? 0) + 1);
  if (counts.size > 1) {
    const [common] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    for (const [url, sig] of hoursByPage) {
      if (sig !== common) err(url, `opening hours in JSON-LD (${sig}) differ from the rest of the site (${common}): keep hours in one config and build every block from it`);
    }
  }
}

// ---- sitemap + robots ---------------------------------------------------
const sitemapFiles = fs.readdirSync(OUT).filter((f) => /^sitemap-\d+\.xml$/.test(f));
const sitemapped = new Set();
for (const f of sitemapFiles) {
  const xml = fs.readFileSync(path.join(OUT, f), 'utf8');
  if (/todo/i.test(xml)) err(`/${f}`, 'sitemap contains TODO (an unfilled siteUrl leaked into hreflang alternates)');
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const p = m[1].replace(SITE, '');
    sitemapped.add(p);
    const i = info.get(p);
    if (!i) err(`/${f}`, `lists ${m[1]} but no such page was built`);
    else if (i.noindex || i.is404) err(`/${f}`, `lists ${m[1]} which is noindex (contradictory signals)`);
    if (redirectSources.has(p)) err(`/${f}`, `lists ${m[1]} which vercel.json redirects to ${redirectSources.get(p)} (the sitemap must list final URLs only)`);
  }
}
const indexableCount = [...info.values()].filter((i) => !i.noindex && !i.is404).length;
if (!indexableCount) warn('/sitemap-index.xml', 'no indexable pages yet (every page is a noindex placeholder), so no sitemap is expected');
else if (!sitemapFiles.length) err('/sitemap-index.xml', 'no sitemap-N.xml was generated');
for (const [url, i] of info) if (!i.noindex && !i.is404 && sitemapFiles.length && !sitemapped.has(url)) err(url, 'indexable page missing from the sitemap');

const robotsPath = path.join(OUT, 'robots.txt');
if (!fs.existsSync(robotsPath)) err('/robots.txt', 'missing');
else {
  const robots = fs.readFileSync(robotsPath, 'utf8');
  if (!robots.includes(`Sitemap: ${SITE}/sitemap-index.xml`)) err('/robots.txt', `does not point at ${SITE}/sitemap-index.xml`);
  if (/^Disallow:\s*\/\s*$/m.test(robots)) err('/robots.txt', 'Disallow: / blocks the whole site');
}

// ---- secrets in the output --------------------------------------------------
// A build-time secret that reaches the browser is public the moment it deploys. The classic cause is
// import.meta.env.SOME_TOKEN, which Vite inlines into the bundle as a literal; server-only values belong
// on process.env. This scans EVERYTHING that ships (html, js, css, json, xml, txt, maps) for token shapes.
const SECRET_SHAPES = [
  [/\bEAAA[A-Za-z0-9_-]{40,}\b/, 'Square access token'],
  [/\bsq0(?:atp|csp)-[A-Za-z0-9_-]{20,}\b/, 'Square secret'],
  [/\bsk_(?:live|test)_[A-Za-z0-9]{20,}\b/, 'Stripe secret key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key id'],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/, 'GitHub token'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'Google API key (check it is the restricted browser key)'],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'private key'],
];
(function scan(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { scan(full); continue; }
    if (!/\.(html|js|mjs|css|json|xml|txt|map|svg|webmanifest)$/i.test(e.name)) continue;
    if (fs.statSync(full).size > 5_000_000) continue;
    const text = fs.readFileSync(full, 'utf8');
    for (const [re, label] of SECRET_SHAPES) {
      if (re.test(text)) err(`/${path.relative(OUT, full).split(path.sep).join('/')}`, `looks like a ${label} in the built output (use process.env, not import.meta.env, for secrets)`);
    }
  }
})(OUT);

// ---- report ----------------------------------------------------------------
const indexable = [...info.values()].filter((i) => !i.noindex && !i.is404).length;
const group = (rows) => rows.reduce((acc, [u, m]) => ((acc[u] ??= []).push(m), acc), {});
console.log(`\naudit-build: ${pages.size} built pages (${indexable} indexable, ${pages.size - indexable} noindex/404), ${SITE}\n`);
for (const [u, ms] of Object.entries(group(errors))) { console.log(`  FAIL ${u}`); ms.forEach((m) => console.log(`       - ${m}`)); }
for (const [u, ms] of Object.entries(group(warnings))) { console.log(`  warn ${u}`); ms.forEach((m) => console.log(`       - ${m}`)); }
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)\n`);
process.exit(errors.length ? 1 : 0);
