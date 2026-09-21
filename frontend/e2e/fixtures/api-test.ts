import { test as base, type APIRequestContext } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { assertIsolatedTarget } from '../../../scripts/e2e-isolation.mjs';

type ApiFixtures = { adminRequest: APIRequestContext; userRequest: APIRequestContext };
function actorToken(actor: 'admin' | 'user'): string {
  const state = JSON.parse(fs.readFileSync(path.resolve(`playwright/.auth/${actor}.json`), 'utf8'));
  const token = state.cookies?.find((cookie: { name: string }) => cookie.name === 'accessToken')?.value;
  if (typeof token !== 'string' || !token) throw new Error('Authentication storage state has no access token.');
  return token;
}
export const test = base.extend<ApiFixtures, { isolatedTarget: void }>({
  // Only target verification is automatic. API-only tests never depend on page/browser.
  isolatedTarget: [async ({}, use) => { await assertIsolatedTarget(); await use(); }, { auto: true, scope: 'worker' }],
  adminRequest: async ({ playwright }, use) => {
    const target = await assertIsolatedTarget();
    const request = await playwright.request.newContext({ baseURL: `${target.apiUrl}/`,
      storageState: { cookies: [], origins: [] }, maxRedirects: 0,
      extraHTTPHeaders: { Authorization: `Bearer ${actorToken('admin')}` } });
    try { await use(request); } finally { await request.dispose(); }
  },
  userRequest: async ({ playwright }, use) => {
    const target = await assertIsolatedTarget();
    const request = await playwright.request.newContext({ baseURL: `${target.apiUrl}/`,
      storageState: { cookies: [], origins: [] }, maxRedirects: 0,
      extraHTTPHeaders: { Authorization: `Bearer ${actorToken('user')}` } });
    try { await use(request); } finally { await request.dispose(); }
  },
});
export { expect } from '@playwright/test';
