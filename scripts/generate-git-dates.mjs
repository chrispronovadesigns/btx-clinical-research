// Writes .git-file-dates.json: { "<repo-relative file>": "<committer ISO date>" } for every
// file git has seen. sitemap-config.ts uses it to give each sitemap URL a truthful per-page
// lastmod instead of stamping the build time on all 79 URLs (which trains Google to ignore
// lastmod). Runs before astro build via the package.json build script; on failure the build
// proceeds and lastmod falls back to build time per URL.
//
// Vercel materializes the repo as a shallow checkout (~10 commits) with no git remote, so
// full history is unavailable in the build. Two things make that workable:
//   1. The shallow boundary commit has no parents, so its file list claims the whole tree.
//      It is excluded; files older than the window simply have no date here.
//   2. Vercel caches node_modules between builds, so the manifest accumulates in
//      node_modules/.cache and each build merges the fresh shallow window over it.
//      Dates converge to full history within a few deploys.
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outFile = '.git-file-dates.json';
const cacheFile = path.join(root, 'node_modules', '.cache', 'git-file-dates.json');

function git(cmd) {
  return execSync(cmd, { cwd: root, maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] }).toString();
}

const dates = {};
// Base layer: a full-history snapshot seeded out of band (GIT_FILE_DATES env var). Vercel's
// build checkout is shallow with no git remote, so history older than its ~10-commit window
// is only reachable through this seed or the build cache below.
if (process.env.GIT_FILE_DATES) {
  try {
    Object.assign(dates, JSON.parse(process.env.GIT_FILE_DATES));
  } catch {
    console.warn('generate-git-dates: GIT_FILE_DATES is not valid JSON; ignoring it');
  }
}
try {
  const isShallow = git('git rev-parse --is-shallow-repository').trim() === 'true';
  const commits = git('git rev-list --count HEAD').trim();

  // A working remote lets a shallow clone restore full history in one step (GitHub
  // Actions with a plain checkout, for example). Vercel's checkout has no remote and
  // this fails silently into the accumulate-and-merge path below.
  if (isShallow) {
    try {
      git('git fetch --unshallow --quiet');
    } catch {
      /* no remote; proceed with the shallow window */
    }
  }
  const unshallowed = isShallow && git('git rev-parse --is-shallow-repository').trim() === 'false';

  const log = git('git log --format=%cI%x00 --name-only').replaceAll('\0', '\n');

  // Groups of "date, files..." in newest-first order. In a shallow clone the last group
  // is the boundary commit whose parentless diff lists the entire tree — skip it.
  const groups = [];
  let current = null;
  for (const line of log.split('\n')) {
    if (/^\d{4}-\d{2}-\d{2}T/.test(line)) {
      current = { date: line, files: [] };
      groups.push(current);
    } else if (line && current) {
      current.files.push(line);
    }
  }
  const usable = isShallow && !unshallowed ? groups.slice(0, -1) : groups;
  // Within the log, newest-first order means the first sighting of a file is its latest change.
  const windowDates = {};
  for (const group of usable) {
    for (const file of group.files) {
      if (!(file in windowDates)) windowDates[file] = group.date;
    }
  }
  // The window is the freshest truth, so it overrides the seed; the cache fills the rest.
  Object.assign(dates, windowDates);
  try {
    const cached = JSON.parse(readFileSync(cacheFile, 'utf8'));
    for (const [file, date] of Object.entries(cached)) {
      if (!(file in dates)) dates[file] = date;
    }
  } catch {
    /* first build after this change has no accumulated history yet */
  }

  console.log(`generate-git-dates: shallow=${isShallow}, commits=${commits}, dated ${Object.keys(dates).length} files`);
} catch (err) {
  console.warn(`generate-git-dates: git log unavailable (${err.message}); sitemap lastmod falls back to build time`);
}

writeFileSync(path.join(root, outFile), JSON.stringify(dates));
try {
  mkdirSync(path.dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(dates));
} catch {
  /* cache write is best-effort */
}
