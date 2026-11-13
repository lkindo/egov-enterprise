import { expect, test as baseTest } from '../fixtures/browser-test';
import { createVisualAdmin } from '../fixtures/visual-admin';
import { anonymousCsrfRequestState } from '../fixtures/csrf';

type Actor = Awaited<ReturnType<typeof createVisualAdmin>>;

/**
 * 커뮤니티 운영자(GAP-CMTY-001, DEC-OPS-416). 운영자로 지정된 일반 사용자가 자기 커뮤니티의 상세 화면에서 가입 신청을 승인하고 소개를
 * 고친다. 운영 범위는 그 커뮤니티 하나다 — 다른 커뮤니티를 다루거나 운영자가 아닌 회원이 운영 API 를 부르면 403 이다(H3). 네트워크를
 * 가로채지 않는다 — 실제 서버 왕복이다.
 */
const test = baseTest.extend<{ operator: Actor; applicant: Actor }>({
  operator: async ({ playwright, baseURL }, use) => {
    const fixtureRequest = await playwright.request.newContext({ baseURL, ...anonymousCsrfRequestState(baseURL) });
    try {
      const actor = await createVisualAdmin(fixtureRequest, baseURL!, { group: 'ROLE_USER' });
      try { await use(actor); } finally { await actor.dispose(); }
    } finally { await fixtureRequest.dispose(); }
  },
  applicant: async ({ playwright, baseURL }, use) => {
    const fixtureRequest = await playwright.request.newContext({ baseURL, ...anonymousCsrfRequestState(baseURL) });
    try {
      const actor = await createVisualAdmin(fixtureRequest, baseURL!, { group: 'ROLE_USER' });
      try { await use(actor); } finally { await actor.dispose(); }
    } finally { await fixtureRequest.dispose(); }
  },
});

test.describe('커뮤니티 운영자', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('운영자는 자기 커뮤니티의 가입 신청을 승인하고 소개를 고치며 다른 커뮤니티는 다루지 못한다', async ({ adminRequest, request, actorPage, operator, applicant }) => {
    const communities = '/api/v1/admin/content/community';
    const suffix = Date.now();
    const ownName = `E2E 운영 커뮤니티 ${suffix}`;
    const otherName = `E2E 다른 커뮤니티 ${suffix}`;
    const ids: number[] = [];
    try {
      for (const cmntyNm of [ownName, otherName]) {
        const created = await adminRequest.post(communities, { data: { cmntyNm, cmntyIntroCn: 'e2e 운영자', useYn: 'Y' } });
        expect(created.status()).toBe(201);
        ids.push((await created.json()).data.cmntySn);
      }
      const [ownId, otherId] = ids;
      const own = `/api/v1/communities/${ownId}`;

      // 1. 운영자가 될 사람이 가입하고, 관리자가 승인한 뒤 운영자로 지정한다(관리자는 운영자가 아니어도 지정할 수 있다).
      expect((await request.post(`${own}/join`, { headers: operator.authorization })).ok()).toBe(true);
      expect((await adminRequest.patch(`${communities}/${ownId}/members/${operator.esntlId}/approve`)).ok()).toBe(true);
      expect((await adminRequest.put(`${own}/operator/members/${operator.esntlId}/manager`, { data: { manager: true } })).ok()).toBe(true);

      // 2. 다른 사람이 가입을 신청한다. 신청 상태로는 운영 API 를 부를 수 없다.
      expect((await request.post(`${own}/join`, { headers: applicant.authorization })).ok()).toBe(true);
      expect((await request.get(`${own}/operator/members`, { headers: applicant.authorization })).status()).toBe(403);

      // 3. 운영자가 상세 화면의 운영 패널에서 신청을 승인한다.
      const { page } = await actorPage({ storageState: operator.storageState });
      await page.goto(`/cop/cmy/selectCommunityDetail/${ownId}`);
      await expect(page.getByRole('heading', { name: ownName, exact: true })).toBeVisible();
      const panel = page.getByRole('list', { name: '운영 회원 목록', exact: true });
      const [approved] = await Promise.all([
        page.waitForResponse(response => response.request().method() === 'PUT'
          && new URL(response.url()).pathname === `${own}/operator/members/${applicant.esntlId}/approval`),
        panel.getByRole('button', { name: /가입 승인$/ }).click(),
      ]);
      expect(approved.status()).toBe(200);
      const membership = await request.get(`${own}/membership`, { headers: applicant.authorization });
      expect((await membership.json()).data).toMatchObject({ status: 'MEMBER', operator: false });

      // 승인된 회원은 목록의 '내 가입 커뮤니티'에서 그 커뮤니티만 본다(서버가 거른다 — 가입하지 않은 다른 커뮤니티는 빠진다).
      const { page: applicantPage } = await actorPage({ storageState: applicant.storageState });
      await applicantPage.goto('/cop/cmy/selectCommunityList');
      const [joinedList] = await Promise.all([
        applicantPage.waitForResponse(response => response.request().method() === 'GET'
          && new URL(response.url()).pathname === '/api/v1/communities' && new URL(response.url()).searchParams.get('joined') === 'true'),
        applicantPage.getByRole('button', { name: '내 가입 커뮤니티', exact: true }).click(),
      ]);
      expect(joinedList.ok()).toBe(true);
      await expect(applicantPage.getByText(ownName, { exact: true })).toBeVisible();
      await expect(applicantPage.getByText(otherName, { exact: true })).toHaveCount(0);

      // 4. 운영자가 소개를 고친다 — 사용 여부·템플릿은 관리자 몫이라 그대로다.
      const intro = `운영자가 고친 소개 ${suffix}`;
      await page.getByLabel('커뮤니티 소개', { exact: true }).fill(intro);
      const [saved] = await Promise.all([
        page.waitForResponse(response => response.request().method() === 'PUT'
          && new URL(response.url()).pathname === `${own}/operator/profile`),
        page.getByRole('button', { name: '소개 저장', exact: true }).click(),
      ]);
      expect(saved.status()).toBe(200);
      const after = (await (await adminRequest.get(`${communities}/${ownId}`)).json()).data;
      expect(after).toMatchObject({ cmntyNm: ownName, cmntyIntroCn: intro, useYn: 'Y' });

      // 5. 운영자가 일반 회원을 운영자로 지정한다 — 지정 단추는 운영자가 아닌 회원 행에만 있다.
      const readMembership = async () => (await (await request.get(`${own}/membership`, { headers: applicant.authorization })).json()).data;
      const showMembers = () => page.getByRole('group', { name: '회원 상태 필터', exact: true }).getByRole('button', { name: '회원', exact: true }).click();
      await showMembers();
      const [designated] = await Promise.all([
        page.waitForResponse(response => response.request().method() === 'PUT'
          && new URL(response.url()).pathname === `${own}/operator/members/${applicant.esntlId}/manager`),
        panel.getByRole('button', { name: /운영자 지정$/ }).click(),
      ]);
      expect(designated.ok()).toBe(true);
      expect(await readMembership()).toMatchObject({ status: 'MEMBER', operator: true });
      // 운영자는 먼저 해제해야 탈퇴시킬 수 있다 — 해제는 관리자가 하고 다시 일반 회원으로 돌아간다.
      expect((await adminRequest.put(`${own}/operator/members/${applicant.esntlId}/manager`, { data: { manager: false } })).ok()).toBe(true);

      // 6. 운영자가 일반 회원을 탈퇴 처리한다(확인을 거친다).
      await page.reload();
      await showMembers();
      const [withdrawn] = await Promise.all([
        page.waitForResponse(response => response.request().method() === 'DELETE'
          && new URL(response.url()).pathname === `${own}/operator/members/${applicant.esntlId}`),
        (async () => {
          await panel.getByRole('button', { name: /탈퇴 처리$/ }).click();
          await page.getByRole('dialog').getByRole('button', { name: '탈퇴 처리', exact: true }).click();
        })(),
      ]);
      expect(withdrawn.ok()).toBe(true);
      expect(await readMembership()).toMatchObject({ status: 'WITHDRAWN', operator: false });

      // 7. 탈퇴한 사람이 다시 신청하면 운영자가 반려한다 — 신청 기록이 지워져 다시 신청할 수 있다.
      expect((await request.post(`${own}/join`, { headers: applicant.authorization })).ok()).toBe(true);
      await page.reload();
      const [rejected] = await Promise.all([
        page.waitForResponse(response => response.request().method() === 'DELETE'
          && new URL(response.url()).pathname === `${own}/operator/members/${applicant.esntlId}/request`),
        (async () => {
          await panel.getByRole('button', { name: /가입 반려$/ }).click();
          await page.getByRole('dialog').getByRole('button', { name: '반려', exact: true }).click();
        })(),
      ]);
      expect(rejected.ok()).toBe(true);
      expect(await readMembership()).toMatchObject({ status: 'NONE' });

      // 8. 운영 범위는 자기 커뮤니티뿐이다 — 다른 커뮤니티는 403, 운영자가 아닌 사람도 403 이다.
      expect((await request.get(`/api/v1/communities/${otherId}/operator/members`, { headers: operator.authorization })).status()).toBe(403);
      expect((await request.put(`/api/v1/communities/${otherId}/operator/profile`, {
        headers: operator.authorization, data: { cmntyNm: '탈취', version: 0 },
      })).status()).toBe(403);
      expect((await request.get(`${own}/operator/members`, { headers: applicant.authorization })).status()).toBe(403);
      expect((await request.delete(`${own}/operator/members/${operator.esntlId}`, { headers: applicant.authorization })).status()).toBe(403);
    } finally {
      for (const id of ids) expect((await adminRequest.delete(`${communities}/${id}`)).ok()).toBe(true);
    }
  });
});
