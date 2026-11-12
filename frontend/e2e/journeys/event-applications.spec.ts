import fs from 'fs';
import path from 'path';
import { expect, test as baseTest } from '../fixtures/browser-test';
import { createVisualAdmin } from '../fixtures/visual-admin';
import { anonymousCsrfRequestState } from '../fixtures/csrf';

type Actor = Awaited<ReturnType<typeof createVisualAdmin>>;

/**
 * [V2_152] 행사 참가 신청·정원(DEC-OPS-416 ②). 담당자가 정원 1명인 행사를 열면 일반 사용자 두 사람 가운데 먼저 신청한 사람만 자리를
 * 얻는다 — 정원이 차면 다른 사람의 신청 단추가 잠기고 서버도 409 로 막는다. 먼저 신청한 사람이 취소하면 자리가 돌아오고, 담당자가
 * 남은 신청을 승인한다. 네트워크를 가로채지 않는다 — 실제 서버 왕복이다.
 */
const test = baseTest.extend<{ first: Actor; second: Actor }>({
  first: async ({ playwright, baseURL }, use) => {
    const fixtureRequest = await playwright.request.newContext({ baseURL, ...anonymousCsrfRequestState(baseURL) });
    try {
      const actor = await createVisualAdmin(fixtureRequest, baseURL!, { group: 'ROLE_USER' });
      try { await use(actor); } finally { await actor.dispose(); }
    } finally { await fixtureRequest.dispose(); }
  },
  second: async ({ playwright, baseURL }, use) => {
    const fixtureRequest = await playwright.request.newContext({ baseURL, ...anonymousCsrfRequestState(baseURL) });
    try {
      const actor = await createVisualAdmin(fixtureRequest, baseURL!, { group: 'ROLE_USER' });
      try { await use(actor); } finally { await actor.dispose(); }
    } finally { await fixtureRequest.dispose(); }
  },
});

/** 한국 날짜 yyyyMMdd — 신청 마감은 서버의 한국 날짜로 판정한다. */
const seoulYmd = (offsetDays = 0) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })
  .format(new Date(Date.now() + offsetDays * 86_400_000)).replace(/-/g, '');

test.describe('행사 참가 신청', () => {
  test.use({ storageState: 'playwright/.auth/admin.json', viewport: { width: 1920, height: 1080 } });

  test('사용자는 정원이 있는 행사에 참가 신청·취소하고 정원이 차면 다른 사용자는 신청하지 못하며 담당자가 신청을 승인한다', async ({ page, request, first, second, actorPage }) => {
    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
    const authData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'playwright', '.auth', 'admin.json'), 'utf-8'));
    const adminToken: string | undefined = authData.cookies.find((cookie: { name: string; value: string }) => cookie.name === 'accessToken')?.value;
    expect(adminToken, '담당자 인증 세션이 있어야 한다').toBeTruthy();
    const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
    const name = `E2E 정원 행사 ${Date.now()}`;
    const eventDay = seoulYmd(1);

    // 1. 담당자가 정원 1명·오늘 마감인 행사를 연다.
    const created = await request.post(`${API_BASE}/admin/operation/events`, {
      headers,
      data: { evntNm: name, evntCn: 'e2e 참가 신청', bizYr: eventDay.slice(0, 4), evntBgngYmd: eventDay, evntEndYmd: eventDay,
        evntUseCnt: 1, pscpNope: 1, aplyDdlnYmd: seoulYmd(0) },
    });
    expect(created.status()).toBe(201);
    const evntSn: number = (await created.json()).data;

    try {
      // 2. 첫 사용자가 화면에서 신청한다 — 자리 하나가 찬다.
      const { page: firstPage } = await actorPage({ storageState: first.storageState });
      await firstPage.goto('/events');
      const firstCard = firstPage.getByRole('listitem', { name, exact: true });
      await expect(firstCard).toContainText('0/1명');
      const [applied] = await Promise.all([
        firstPage.waitForResponse(response => response.request().method() === 'POST'
          && new URL(response.url()).pathname === `/api/v1/events/${evntSn}/applications`),
        firstCard.getByRole('button', { name: `${name} 참가 신청`, exact: true }).click(),
      ]);
      expect(applied.status()).toBe(200);
      await expect(firstCard).toContainText('1/1명');
      await expect(firstCard).toContainText('승인 대기');

      // 3. 정원이 찼으므로 두 번째 사용자는 신청 단추가 잠기고, 서버에 바로 보내도 409 다.
      const { page: secondPage } = await actorPage({ storageState: second.storageState });
      await secondPage.goto('/events');
      const secondCard = secondPage.getByRole('listitem', { name, exact: true });
      await expect(secondCard.getByRole('button', { name: `${name} 신청 마감`, exact: true })).toBeDisabled();
      expect((await request.post(`${API_BASE}/events/${evntSn}/applications`, { headers: second.authorization })).status()).toBe(409);

      // 4. 첫 사용자가 확인을 거쳐 취소하면 자리가 돌아온다.
      await firstCard.getByRole('button', { name: `${name} 신청 취소`, exact: true }).click();
      const [cancelled] = await Promise.all([
        firstPage.waitForResponse(response => response.request().method() === 'DELETE'
          && new URL(response.url()).pathname === `/api/v1/events/${evntSn}/applications/me`),
        firstPage.getByRole('dialog').getByRole('button', { name: '신청 취소', exact: true }).click(),
      ]);
      expect(cancelled.ok()).toBe(true);
      await expect(firstCard).toContainText('0/1명');
      // 취소한 신청은 '취소' 로 남고 다시 신청할 수 있다.
      await expect(firstCard.getByText('취소', { exact: true })).toBeVisible();
      await expect(firstCard.getByRole('button', { name: `${name} 참가 신청`, exact: true })).toBeEnabled();

      // 5. 두 번째 사용자가 다시 읽고 신청한다.
      await secondPage.reload();
      const [secondApplied] = await Promise.all([
        secondPage.waitForResponse(response => response.request().method() === 'POST'
          && new URL(response.url()).pathname === `/api/v1/events/${evntSn}/applications`),
        secondCard.getByRole('button', { name: `${name} 참가 신청`, exact: true }).click(),
      ]);
      expect(secondApplied.status()).toBe(200);

      // 6. 담당자가 관리 화면의 신청자 창에서 남은 신청을 승인한다.
      await page.goto('/admin/operation/events');
      await page.getByLabel('행사 명칭 · 상세 내용').fill(name);
      await page.getByRole('button', { name: '조회', exact: true }).click();
      await page.getByRole('button', { name: `${name} 신청자`, exact: true }).click();
      const applicants = page.getByRole('dialog').getByRole('region', { name: `${name} 신청자` });
      await expect(applicants).toContainText('승인 대기');
      const [approved] = await Promise.all([
        page.waitForResponse(response => response.request().method() === 'PUT'
          && /\/api\/v1\/admin\/operation\/events\/\d+\/applications\/\d+\/approval$/.test(new URL(response.url()).pathname)),
        applicants.getByRole('button', { name: /승인$/ }).click(),
      ]);
      expect(approved.ok()).toBe(true);

      // 7. 두 번째 사용자 화면에서 승인으로 보인다.
      await secondPage.reload();
      await expect(secondCard).toContainText('승인');
      await expect(secondCard.getByRole('button', { name: `${name} 신청 취소`, exact: true })).toBeVisible();
    } finally {
      // 자리를 차지한 신청이 남은 행사는 지우지 않으므로 먼저 반려한 뒤 지운다.
      const listed = await request.get(`${API_BASE}/admin/operation/events/${evntSn}/applications?size=100`, { headers });
      if (listed.ok()) {
        for (const application of (await listed.json()).data.list as Array<{ evntAplySn: number; aplySttsCd: string; version: number }>) {
          if (application.aplySttsCd === 'APPLIED' || application.aplySttsCd === 'APPROVED') {
            await request.put(`${API_BASE}/admin/operation/events/${evntSn}/applications/${application.evntAplySn}/rejection`,
              { headers, data: { version: application.version } });
          }
        }
      }
      expect((await request.delete(`${API_BASE}/admin/operation/events/${evntSn}`, { headers })).ok()).toBe(true);
    }
  });
});
