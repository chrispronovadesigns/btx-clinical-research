import { request } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Vercel Authentication guards preview deployments. When the repo secret and a
// remote base URL are both present, exchange the project's automation-bypass
// token for the _vercel_jwt cookie once, then save it as storage state. The
// cookie rides on every same-origin request afterwards — including the service
// worker script fetch, which never sees page-level extraHTTPHeaders.
export const BYPASS_STATE_PATH = path.resolve(
  process.cwd(),
  'tests',
  'e2e',
  '.vercel-bypass-state.json',
);

export function useVercelBypass(): boolean {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? '';
  return !!process.env.VERCEL_AUTOMATION_BYPASS_SECRET && !!baseURL && !/localhost|127\.0\.0\.1/.test(baseURL);
}

export default async function globalSetup() {
  if (!useVercelBypass()) {
    fs.rmSync(BYPASS_STATE_PATH, { force: true });
    return;
  }
  const ctx = await request.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL,
    extraHTTPHeaders: {
      'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET!,
      'x-vercel-set-bypass-cookie': 'true',
    },
  });
  const res = await ctx.get('/');
  if (!res.ok()) {
    throw new Error(`Vercel protection bypass failed: GET / -> ${res.status()}`);
  }
  await ctx.storageState({ path: BYPASS_STATE_PATH });
}
