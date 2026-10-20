import { test as base, type APIRequestContext } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { assertIsolatedTarget } from '../../../scripts/e2e-isolation.mjs';
import { CSRF_HEADER, E2E_CSRF_TOKEN, withCsrfCookies } from './csrf';

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
  // 기본 request 는 test.use 의 storageState(로그인 쿠키)를 합쳐 쿠키 자격을 실을 수 있다. 브라우저와 같이 이중 제출
  // CSRF 토큰(쿠키와 같은 값의 헤더)을 싣는다 — 쿠키 자격이 없는 요청에는 영향이 없다(fixtures/csrf.ts).
  request: async ({ playwright, storageState, baseURL }, use) => {
    const target = await assertIsolatedTarget();
    const request = await playwright.request.newContext({
      storageState: withCsrfCookies(storageState, [baseURL, target.webUrl, target.apiUrl]),
      extraHTTPHeaders: { [CSRF_HEADER]: E2E_CSRF_TOKEN },
    });
    try { await use(request); } finally { await request.dispose(); }
  },
  adminRequest: async ({ playwright }, use) => {
    const target = await assertIsolatedTarget();
    const request = await playwright.request.newContext({ baseURL: `${target.apiUrl}/`,
      storageState: withCsrfCookies(undefined, [target.apiUrl]), maxRedirects: 0,
      extraHTTPHeaders: { Authorization: `Bearer ${actorToken('admin')}`, [CSRF_HEADER]: E2E_CSRF_TOKEN } });
    try { await use(request); } finally { await request.dispose(); }
  },
  userRequest: async ({ playwright }, use) => {
    const target = await assertIsolatedTarget();
    const request = await playwright.request.newContext({ baseURL: `${target.apiUrl}/`,
      storageState: withCsrfCookies(undefined, [target.apiUrl]), maxRedirects: 0,
      extraHTTPHeaders: { Authorization: `Bearer ${actorToken('user')}`, [CSRF_HEADER]: E2E_CSRF_TOKEN } });
    try { await use(request); } finally { await request.dispose(); }
  },
});
export { expect } from '@playwright/test';
