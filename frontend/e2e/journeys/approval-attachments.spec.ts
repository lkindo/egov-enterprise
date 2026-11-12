import fs from 'fs';
import path from 'path';
import { expect, test as baseTest } from '../fixtures/browser-test';
import { createVisualAdmin } from '../fixtures/visual-admin';
import { anonymousCsrfRequestState } from '../fixtures/csrf';

type Actor = Awaited<ReturnType<typeof createVisualAdmin>>;

/**
 * [V2_151] 약식결재 첨부와 부재 대리결재(DEC-OPS-416 ②). 대표 결재 시험(approvals.spec.ts — DB 벤더 인증 증거의 입력)은 건드리지
 * 않고 이 흐름만 따로 본다. 기안자가 첨부를 붙여 올리고, 차례인 결재자가 부재 기간에 맡긴 대리결재자가 첨부를 내려받고 대신
 * 승인한다. 결재선 밖 사람은 첨부를 열지 못한다(403). 네트워크를 가로채지 않는다 — 실제 서버 왕복이다.
 */
// 차례인 결재자(부재로 결재를 맡긴다), 대리결재자, 결재와 무관한 사람 — 서로 다른 세 계정이다.
const test = baseTest.extend<{ approver: Actor; substitute: Actor; outsider: Actor }>({
  approver: async ({ playwright, baseURL }, use) => {
    const fixtureRequest = await playwright.request.newContext({ baseURL, ...anonymousCsrfRequestState(baseURL) });
    try {
      const actor = await createVisualAdmin(fixtureRequest, baseURL!);
      try { await use(actor); } finally { await actor.dispose(); }
    } finally { await fixtureRequest.dispose(); }
  },
  substitute: async ({ playwright, baseURL }, use) => {
    const fixtureRequest = await playwright.request.newContext({ baseURL, ...anonymousCsrfRequestState(baseURL) });
    try {
      const actor = await createVisualAdmin(fixtureRequest, baseURL!);
      try { await use(actor); } finally { await actor.dispose(); }
    } finally { await fixtureRequest.dispose(); }
  },
  outsider: async ({ playwright, baseURL }, use) => {
    const fixtureRequest = await playwright.request.newContext({ baseURL, ...anonymousCsrfRequestState(baseURL) });
    try {
      const actor = await createVisualAdmin(fixtureRequest, baseURL!);
      try { await use(actor); } finally { await actor.dispose(); }
    } finally { await fixtureRequest.dispose(); }
  },
});

const todayYmd = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })
  .format(new Date()).replace(/-/g, '');

test.describe('약식결재 첨부·부재 대리결재', () => {
  test.use({ storageState: 'playwright/.auth/admin.json', viewport: { width: 1920, height: 1080 } });

  test('첨부를 붙여 올린 결재를 부재 중 대리결재자가 첨부를 내려받고 대신 승인한다', async ({ page, request, approver, substitute, outsider, actorPage }) => {
    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
    const authData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'playwright', '.auth', 'admin.json'), 'utf-8'));
    const adminToken: string | undefined = authData.cookies.find((cookie: { name: string; value: string }) => cookie.name === 'accessToken')?.value;
    expect(adminToken, '기안자 인증 세션이 있어야 한다').toBeTruthy();
    const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
    const taskCode = 'E2ETASK';
    const taskName = 'E2E 업무';
    const documentTitle = `E2E 첨부 대리결재 ${Date.now()}`;
    await request.post(`${API_BASE}/admin/system/codes/detail`, { headers, data: { cdId: 'COM075', dtlCd: taskCode, dtlCdNm: taskName, dtlCdExpln: 'e2e 결재 완주용', useYn: 'Y' } });
    const meRes = await request.get(`${API_BASE}/users/me`, { headers });
    expect(meRes.ok()).toBeTruthy();
    const me: { userNm?: string; esntlId?: string } = (await meRes.json()).data;

    try {
      // 1. 기안자가 첨부를 붙여 상신한다 — 고른 파일은 상신할 때 한 번에 올라가 새 묶음이 된다.
      await page.goto('/approvals');
      await page.getByRole('button', { name: '새 결재 기안' }).click();
      const dialog = page.getByRole('dialog', { name: '새 결재 기안' });
      await dialog.getByLabel('제목 (필수)').fill(documentTitle);
      await dialog.locator('#approval-draft-task-type').click();
      await page.getByRole('option', { name: taskName }).click();
      await dialog.getByLabel('파일 첨부 선택').setInputFiles({ name: 'e2e-budget.txt', mimeType: 'text/plain', buffer: Buffer.from('예산 근거 자료') });
      await dialog.getByRole('button', { name: '다음', exact: true }).click();
      await dialog.getByRole('button', { name: '1단계 결재자 선택', exact: true }).click();
      const picker = dialog.getByRole('group', { name: '1단계 결재자 고르기' });
      await picker.getByRole('textbox', { name: '결재자 이름 검색' }).fill(me.userNm!);
      await picker.getByRole('button', { name: '찾기', exact: true }).click();
      const candidate = picker.getByRole('button').filter({ has: page.getByText(`ID: ${approver.esntlId}`, { exact: true }) });
      await candidate.click();
      await picker.getByRole('button', { name: '다 골랐어요', exact: true }).click();
      await dialog.getByRole('button', { name: '다음', exact: true }).click();
      const [submitted] = await Promise.all([
        page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v1/approvals'),
        dialog.getByRole('button', { name: '결재 상신', exact: true }).click(),
      ]);
      expect(submitted.ok()).toBe(true);
      const atchFileSn: unknown = submitted.request().postDataJSON().atchFileSn;
      expect(Number.isInteger(atchFileSn) && (atchFileSn as number) > 0, '상신 요청이 올린 첨부 묶음을 싣는다').toBe(true);
      const approvalId: number = (await submitted.json()).data;

      // 2. 결재선 밖 사람은 첨부를 열지 못한다(본문과 같은 열람 범위, 관리자 우회 없음). 결재에 붙은 첨부는 기안자도 하나씩 지우지 못한다.
      expect((await request.get(`${API_BASE}/files/${atchFileSn}`, { headers: outsider.authorization })).status()).toBe(403);
      const listed = await request.get(`${API_BASE}/files/${atchFileSn}`, { headers });
      expect(listed.ok()).toBe(true);
      const fileSn: number = (await listed.json()).data[0].fileSn;
      expect((await request.delete(`${API_BASE}/files/${atchFileSn}/${fileSn}`, { headers })).status()).toBe(403);

      // 3. 차례인 결재자가 오늘 부재로 결재를 대리결재자에게 맡긴다(관리자 지정). 맡기기 전 대리결재자는 문서·첨부를 열지 못한다.
      expect((await request.get(`${API_BASE}/approvals/${approvalId}`, { headers: substitute.authorization })).status()).toBe(404);
      expect((await request.get(`${API_BASE}/files/${atchFileSn}`, { headers: substitute.authorization })).status()).toBe(403);
      const today = todayYmd();
      const delegated = await request.put(`${API_BASE}/admin/system/user-absences/${approver.esntlId}`, {
        headers, data: { userId: approver.esntlId, userAbsnYn: 'Y', sbtAprvrId: substitute.esntlId, absnBgngYmd: today, absnEndYmd: today },
      });
      expect(delegated.ok()).toBe(true);

      // 4. 대리결재자가 대기함에서 문서를 열고 첨부를 내려받은 뒤 원결재자 대신 승인한다.
      const { page: substitutePage } = await actorPage({ storageState: substitute.storageState });
      await substitutePage.goto('/approvals');
      const item = substitutePage.getByTestId('approval-item').filter({ has: substitutePage.getByRole('button', { name: `${documentTitle} #${approvalId} 상세 열기`, exact: true }) });
      await item.getByRole('button').click();
      await expect(substitutePage.getByRole('note')).toContainText('대신 결재합니다');
      const attachments = substitutePage.getByRole('region', { name: '첨부 파일' });
      await expect(attachments).toContainText('e2e-budget.txt');
      const [download] = await Promise.all([
        substitutePage.waitForEvent('download'),
        attachments.getByRole('button', { name: 'e2e-budget.txt 내려받기' }).click(),
      ]);
      expect(download.suggestedFilename()).toBe('e2e-budget.txt');
      const [decided] = await Promise.all([
        substitutePage.waitForResponse(response => response.request().method() === 'PUT' && new URL(response.url()).pathname === `/api/v1/approvals/${approvalId}/confirm`),
        (async () => {
          await substitutePage.getByRole('button', { name: '결재 승인', exact: true }).click();
          await substitutePage.getByRole('button', { name: '지금 처리' }).click();
        })(),
      ]);
      expect(decided.ok()).toBe(true);
      expect(decided.request().postDataJSON().onBehalfOf).toBe(approver.esntlId);

      // 5. 결재선에는 원결재자와 대신 결정한 사람이 따로 남는다.
      const detail = await request.get(`${API_BASE}/approvals/${approvalId}`, { headers });
      const approverLine = (await detail.json()).data.stages[0].approvers[0];
      expect(approverLine.userId).toBe(approver.esntlId);
      expect(approverLine.substituteId).toBe(substitute.esntlId);
      await page.goto(`/approvals?tab=SUBMITTED&doc=${approvalId}`);
      await expect(page.getByRole('list', { name: '결재선 진행', exact: true })).toContainText('대리결재:');
    } finally {
      // 부재 행을 남기지 않는다 — 임시 계정 삭제 전에 대리결재 지정을 걷는다.
      await request.put(`${API_BASE}/admin/system/user-absences/${approver.esntlId}`, { headers, data: { userId: approver.esntlId, userAbsnYn: 'N' } });
    }
  });
});
