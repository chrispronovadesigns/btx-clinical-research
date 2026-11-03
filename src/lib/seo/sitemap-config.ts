import fs from 'node:fs';
import path from 'node:path';
import type { SitemapItem } from '@astrojs/sitemap';

const SITE = 'https://btxclinicalresearch.com';
const PAGES = path.resolve(process.cwd(), 'src', 'pages');

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

// --- Per-page lastmod -------------------------------------------------------
// A fake date (the build time) trains Google to ignore lastmod. Each page gets
// the newest commit among the files that produce it: its src/pages file, the
// layouts/components it imports, and src content mentioning its URL slug.
// scripts/generate-git-dates.mjs (prebuild) supplies the file dates; layers are
// the GIT_FILE_DATES env seed, the build cache, and the current shallow window.
// A page with no attributable date gets NO lastmod rather than a made-up one.
const LASTMOD_MANIFEST = '.git-file-dates.json';
const SCAN_DIRS = ['src/pages', 'src/components', 'src/layouts', 'src/data'];

function loadFileDates(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), LASTMOD_MANIFEST), 'utf8'));
  } catch {
    return {};
  }
}

let contentIndex: { file: string; content: string }[] | null = null;
function getContentIndex() {
  if (contentIndex) return contentIndex;
  contentIndex = [];
  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(astro|ts|json)$/.test(e.name)) {
        try {
          contentIndex!.push({ file: p.split(path.sep).join('/'), content: fs.readFileSync(p, 'utf8') });
        } catch {
          /* unreadable file contributes nothing */
        }
      }
    }
  };
  for (const dir of SCAN_DIRS) walk(dir);
  return contentIndex;
}

function pageFileFor(urlPath: string): string | null {
  const rel = urlPath.replace(/^\/|\/$/g, '');
  if (!rel) return fs.existsSync(path.join(PAGES, 'index.astro')) ? 'src/pages/index.astro' : null;
  for (const candidate of [`src/pages/${rel}.astro`, `src/pages/${rel}/index.astro`]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

// "import X from '@/layouts/Y.astro'" / "'@/components/sections/Y.astro'"
function ownerImportsOf(content: string): string[] {
  const files: string[] = [];
  for (const m of content.matchAll(/'@\/(layouts|components|data)\/([A-Za-z0-9/-]+)\.(astro|ts)'/g)) {
    files.push(`src/${m[1]}/${m[2]}.${m[3]}`);
  }
  return files;
}

/** Files whose last change should count as a change to this page. */
export function attributionFilesFor(urlPath: string): string[] {
  const candidates = new Set<string>();
  const pageFile = pageFileFor(urlPath);
  if (pageFile) {
    candidates.add(pageFile);
    const content = fs.readFileSync(pageFile, 'utf8');
    for (const f of ownerImportsOf(content)) candidates.add(f);
    // One level into each layout's own imports (a layout pulls in shared sections).
    for (const f of ownerImportsOf(content)) {
      if (!f.endsWith('.astro')) continue;
      try {
        for (const g of ownerImportsOf(fs.readFileSync(f, 'utf8'))) candidates.add(g);
      } catch {
        /* missing file contributes nothing */
      }
    }
  }
  const slug = urlPath.replace(/^\/|\/$/g, '');
  if (slug) {
    for (const { file, content } of getContentIndex()) {
      if (content.includes(slug)) candidates.add(file);
    }
  }
  return [...candidates];
}

export function resolveLastmod(urlPath: string, fileDates: Record<string, string>): string | undefined {
  let newest: { date: string; t: number } | undefined;
  for (const file of attributionFilesFor(urlPath)) {
    const date = fileDates[file];
    if (!date) continue;
    const t = new Date(date).getTime();
    if (!Number.isNaN(t) && (!newest || t > newest.t)) newest = { date, t };
  }
  return newest?.date;
}

const fileDates = loadFileDates();

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
  const lastmod = resolveLastmod(path, fileDates);
  if (lastmod) item.lastmod = lastmod;

  return item;
}
