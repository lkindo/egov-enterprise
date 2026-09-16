import { test, expect } from './fixtures/base-test';
import { createVisualAdmin } from './fixtures/visual-admin';
import fs from 'fs';
import path from 'path';

type ApprovalActor = Awaited<ReturnType<typeof createVisualAdmin>>;

// 결재자는 신청자와 다른 계정이어야 한다(DEC-OPS-095 — 자기 결재 금지). 일회용 관리자는 현재 관리자와
// 표시 이름이 같아(동명이인) 검색 결과 순서에 의존하지 않고 고유 ID 로 고르는 경로도 함께 검증한다.
const approvalTest = test.extend<{ approver: ApprovalActor; finalApprover: ApprovalActor }>({
    approver: async ({ playwright, baseURL }, use) => {
        const fixtureRequest = await playwright.request.newContext({
            baseURL, storageState: { cookies: [], origins: [] },
        });
        try {
            const approver = await createVisualAdmin(fixtureRequest, baseURL!);
            try {
                await use(approver);
            } finally {
                await approver.dispose();
            }
        } finally {
            await fixtureRequest.dispose();
        }
    },
    finalApprover: async ({ playwright, baseURL }, use) => {
        const fixtureRequest = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
        try {
            const actor = await createVisualAdmin(fixtureRequest, baseURL!);
            try { await use(actor); } finally { await actor.dispose(); }
        } finally { await fixtureRequest.dispose(); }
    },
});

/**
 * Tier 11: Enterprise Workflow & Productivity
 * 전자결재 및 스마트 툴킷(일정, 업무보고) 등 핵심 기업 워크플로우 검증
 */
test.describe('Tier 11: Enterprise Workflow & Productivity', () => {
    test.use({ 
        storageState: 'playwright/.auth/admin.json',
        viewport: { width: 1920, height: 1080 }
    });

    /*
     * [2026-09-05 계약 전환 — 실제 상신] 2026-08-04 에 이 테스트는 "상신 미지원을 숨기지 않는다" 로
     * 바뀌었고, 주석은 "실제 상신이 구현되면 이 테스트는 red 가 된다 — 그때 '저장되고 목록에서
     * 조회된다' 로 다시 바꾼다" 고 예고했다. 그 시점이다.
     *
     * 결재함의 '새 결재 기안' 다이얼로그가 `POST /api/v1/approvals` 로 저장하고, 세 탭(대기·내가 올린·
     * 내가 처리한)이 각각 자기 축의 API 를 부른다.
     *
     * [2026-09-14 DEC-OPS-095] 종전에는 결재자를 **자기 자신**으로 골라 한 계정으로 완주했다. 그 경로가 곧
     * 결함(스스로 승인)이었으므로 서버가 막는다. 이제 신청자(관리자)가 다른 계정(일회용 관리자)을 결재자로
     * 올리고, 그 계정의 세션이 대기함에서 승인한다. 본인에게 올리는 상신은 400 이어야 한다.
     *
     * ⚠ 업무 구분은 공통코드 COM075 의 상세코드다. 시드에는 상세코드가 없으므로(PD-DB-003 — 원천
     *   없는 임의 시드 금지) 테스트가 관리자 API 로 코드 하나를 보장한 뒤 시작한다. 이미 있으면
     *   등록 응답은 실패해도 되고, 실제 판정은 `/approvals/task-types` 가 그 코드를 돌려주는지다.
     */
    approvalTest('Workflow: 결재를 올리고 승인해 세 탭을 완주한다', async ({ page, request, browser, baseURL, approver, finalApprover }) => {
        const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
        const authData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'playwright', '.auth', 'admin.json'), 'utf-8'));
        const adminToken: string | undefined = authData.cookies.find((cookie: { name: string; value: string }) => cookie.name === 'accessToken')?.value;
        expect(adminToken, '기안자 인증 세션이 있어야 한다').toBeTruthy();
        const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
        const taskCode = 'E2ETASK'; const taskName = 'E2E 업무';
        const documentTitle = `E2E 출장 결재 ${Date.now()}`;
        const revisedTitle = `${documentTitle} 보완`;
        await request.post(`${API_BASE}/admin/system/codes/detail`, { headers, data: { cdId: 'COM075', dtlCd: taskCode, dtlCdNm: taskName, dtlCdExpln: 'e2e 결재 완주용', useYn: 'Y' } });
        const typesRes = await request.get(`${API_BASE}/approvals/task-types`, { headers });
        expect(typesRes.ok()).toBeTruthy();
        expect(((await typesRes.json()).data as Array<{ dtlCd: string }>).some(code => code.dtlCd === taskCode)).toBe(true);
        const meRes = await request.get(`${API_BASE}/users/me`, { headers }); expect(meRes.ok()).toBeTruthy();
        const me: { userNm?: string; esntlId?: string } = (await meRes.json()).data;
        expect(me.userNm).toBeTruthy(); expect(me.esntlId).toBeTruthy();
        expect(approver.esntlId).not.toBe(me.esntlId); expect(finalApprover.esntlId).not.toBe(me.esntlId);
        expect(finalApprover.esntlId).not.toBe(approver.esntlId);
        const selfDraft = await request.post(`${API_BASE}/approvals`, { headers, data: { taskSeCd: taskCode, docTtl: '자기 결재 거절 확인', stages: [{ kind: 'APPROVAL', approverIds: [me.esntlId] }] } });
        expect(selfDraft.status(), '새 단계 요청도 자기 결재를 거부해야 한다').toBe(400);

        await page.goto('/approvals'); await expect(page.getByRole('heading', { name: '결재 허브' }).first()).toBeVisible();
        await page.getByRole('button', { name: '새 결재 기안' }).click();
        const dialog = page.getByRole('dialog', { name: '새 결재 기안' }); await expect(dialog).toBeVisible();
        await dialog.getByLabel('제목 (필수)').fill(documentTitle);
        await dialog.getByLabel('본문 (선택)').fill('출장 일정과 예산 검토 요청');
        await dialog.locator('#approval-draft-task-type').click(); await page.getByRole('option', { name: taskName }).click();
        await dialog.getByRole('button', { name: '다음', exact: true }).click();
        const pickActor = async (stage: number, actor: ApprovalActor) => {
            await dialog.getByRole('button', { name: `${stage}단계 결재자 선택`, exact: true }).click();
            const picker = page.getByRole('dialog', { name: '결재자 검색 및 선택' });
            await picker.getByLabel('사용자 검색어 입력').fill(me.userNm!); await picker.getByRole('button', { name: '검색', exact: true }).click();
            const matches = picker.getByRole('button', { name: `사용자 선택: ${me.userNm}`, exact: true });
            await matches.filter({ has: page.getByText(`ID: ${actor.esntlId}`, { exact: true }) }).click();
            await expect(picker).toBeHidden();
        };
        await pickActor(1, approver); await dialog.getByRole('button', { name: '다음 단계 추가' }).click();
        await pickActor(2, finalApprover); await dialog.getByLabel('단계 유형').nth(1).selectOption('AGREEMENT');
        await dialog.getByRole('button', { name: '다음', exact: true }).click();
        await expect(dialog.getByLabel('상신 결재선 미리보기')).toContainText('1단계 · 결재 · 전원 승인 (1명)');
        await expect(dialog.getByLabel('상신 결재선 미리보기')).toContainText('2단계 · 합의 · 전원 동의 (1명)');
        await expect(dialog.getByText(/누구든 한 명이 반려하면 문서 전체가 반려/)).toBeVisible();
        const [submittedResponse] = await Promise.all([
            page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v1/approvals'),
            dialog.getByRole('button', { name: '결재 상신', exact: true }).click(),
        ]);
        expect(submittedResponse.ok()).toBe(true);
        expect(submittedResponse.request().postDataJSON().stages).toEqual([{ kind: 'APPROVAL', approverIds: [approver.esntlId] }, { kind: 'AGREEMENT', approverIds: [finalApprover.esntlId] }]);
        const approvalId: number = (await submittedResponse.json()).data; expect(Number.isInteger(approvalId) && approvalId > 0).toBe(true);
        await expect(dialog).toBeHidden(); await expect(page.getByRole('tab', { name: '내가 올린 결재' })).toHaveAttribute('aria-selected', 'true');
        const item = (actorPage: typeof page, title: string) => actorPage.getByTestId('approval-item').filter({ has: actorPage.getByRole('button', { name: `${title} #${approvalId} 상세 열기`, exact: true }) });
        await expect(item(page, documentTitle).getByText('대기 중', { exact: true })).toBeVisible();
        await expect(item(page, documentTitle)).toContainText('1/2단계');
        await page.getByRole('tab', { name: '대기 중인 결재' }).click(); await expect(item(page, documentTitle)).toHaveCount(0);

        const firstContext = await browser.newContext({ baseURL, storageState: approver.storageState });
        const finalContext = await browser.newContext({ baseURL, storageState: finalApprover.storageState });
        try {
            const firstPage = await firstContext.newPage(); const finalPage = await finalContext.newPage();
            await firstPage.goto('/approvals'); await finalPage.goto('/approvals');
            // 다음 단계 사용자는 문서를 조회해도 현재 차례를 처리할 수 없다.
            const premature = await request.get(`${API_BASE}/approvals/${approvalId}`, { headers: finalApprover.authorization }); expect(premature.ok()).toBe(true);
            expect((await premature.json()).data.canApprove).toBe(false);
            await expect(finalPage.getByText('대기 중인 결재가 없습니다.', { exact: true })).toBeVisible();
            await expect(item(finalPage, documentTitle)).toHaveCount(0);
            await item(firstPage, documentTitle).getByRole('button').click();
            await expect(firstPage.getByRole('list', { name: '결재선 진행', exact: true })).toContainText('내 차례');
            await firstPage.getByRole('button', { name: '결재 승인', exact: true }).click();
            await firstPage.getByRole('dialog').getByRole('button', { name: '확인', exact: true }).click();
            await expect(firstPage.getByText('성공적으로 승인되었습니다.')).toBeVisible();
            await firstPage.getByRole('tab', { name: '내가 처리한 결재' }).click(); await expect(item(firstPage, documentTitle)).toBeVisible();
            // 단계 승인만으로 문서 전체가 승인된 것처럼 보이면 red다.
            await expect(item(firstPage, documentTitle).getByText('대기 중', { exact: true })).toBeVisible();
            await expect(item(firstPage, documentTitle)).toContainText('2/2단계');
            await finalPage.reload(); await item(finalPage, documentTitle).getByRole('button').click();
            await expect(finalPage.getByRole('button', { name: '합의 동의', exact: true })).toBeVisible();
            await finalPage.getByRole('textbox', { name: '결재 의견 (반려 시 필수)' }).fill('예산 근거 보완 필요');
            await finalPage.getByRole('button', { name: '결재 반려', exact: true }).click();
            await expect(finalPage.getByRole('dialog')).toContainText('남은 모든 결재는 종료');
            await finalPage.getByRole('dialog').getByRole('button', { name: '확인', exact: true }).click();
            await expect(finalPage.getByText('성공적으로 반려되었습니다.')).toBeVisible();

            await page.reload(); await page.getByRole('tab', { name: '내가 올린 결재' }).click(); await item(page, documentTitle).getByRole('button').click();
            await expect(item(page, documentTitle).getByText('반려됨', { exact: true })).toBeVisible();
            await page.getByRole('button', { name: '수정 후 재상신' }).click();
            const resubmitDialog = page.getByRole('dialog', { name: '결재 재상신' });
            await expect(resubmitDialog.getByLabel('본문 (선택)')).toHaveValue('출장 일정과 예산 검토 요청');
            await resubmitDialog.getByLabel('제목 (필수)').fill(revisedTitle);
            await resubmitDialog.getByLabel('본문 (선택)').fill('예산 근거를 보완한 출장 요청');
            await resubmitDialog.getByRole('button', { name: '다음', exact: true }).click();
            await expect(resubmitDialog.getByText(/결재자와 순서를 다시 확인/)).toBeVisible();
            await resubmitDialog.getByRole('button', { name: '다음', exact: true }).click();
            const [resubmitted] = await Promise.all([
                page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === `/api/v1/approvals/${approvalId}/resubmissions`),
                resubmitDialog.getByRole('button', { name: '새 차수로 재상신' }).click(),
            ]);
            expect(resubmitted.ok()).toBe(true); expect((await resubmitted.json()).data).toBe(approvalId);
            await expect(resubmitDialog).toBeHidden();
            await expect(page.getByLabel('이전 차수 이력')).toContainText(`1차 · ${documentTitle} · 반려`);
            await page.getByLabel('이전 차수 이력').getByText(`1차 · ${documentTitle} · 반려`, { exact: true }).click();
            await expect(page.getByLabel('이전 차수 이력').getByText('출장 일정과 예산 검토 요청', { exact: true })).toBeVisible();
            await expect(page.getByLabel('문서 내용')).toContainText('2차');
            await firstPage.reload(); await firstPage.getByRole('tab', { name: '대기 중인 결재' }).click(); await item(firstPage, revisedTitle).getByRole('button').click();
            await firstPage.getByRole('button', { name: '결재 승인', exact: true }).click(); await firstPage.getByRole('dialog').getByRole('button', { name: '확인', exact: true }).click();
            await expect(firstPage.getByText('성공적으로 승인되었습니다.')).toBeVisible();
            await finalPage.reload(); await item(finalPage, revisedTitle).getByRole('button').click();
            await finalPage.getByRole('button', { name: '합의 동의', exact: true }).click(); await finalPage.getByRole('dialog').getByRole('button', { name: '확인', exact: true }).click();
            await expect(finalPage.getByText('성공적으로 동의되었습니다.')).toBeVisible();
            await finalPage.getByRole('tab', { name: '내가 처리한 결재' }).click(); await expect(item(finalPage, revisedTitle).getByText('승인 완료', { exact: true })).toBeVisible();
        } finally { await firstContext.close(); await finalContext.close(); }
        await page.reload(); await page.getByRole('tab', { name: '내가 올린 결재' }).click();
        await expect(item(page, revisedTitle).getByText('승인 완료', { exact: true })).toBeVisible();
        await expect(page.locator('text=결재 상신이 완료되었습니다')).toHaveCount(0); await expect(page).toHaveURL(/\/approvals$/);
        // 결재 문서/차수는 삭제 API로 지우지 않는다. 이력 보존 계약을 검증한 합성 데이터이며
        // 일회용 사용자만 fixture.dispose로 정리하고 문서는 격리 E2E DB 수명과 함께 폐기한다.
    });
    test('Productivity: Smart Toolkit - Department Schedule', async ({ page }) => {
        console.log('\n>>> Starting Productivity: Smart Toolkit - Schedule');
        
        await page.goto('/smart-toolkit/schedule/dept');
        
        // 일정 관리 대시보드 확인
        await expect(page.locator('.hub-title-main, h1, h2').filter({ hasText: /일정|Schedule/i }).first()).toBeVisible();
        
        console.log('>>> Verifying Schedule Table visibility');
        const table = page.locator('table');
        await expect(table.first()).toBeVisible();
    });

    // [2026-08-10 중복제거] 삭제됨: 'Productivity: Smart Toolkit - Work Report Matrix'.
    //
    //   `if (await tabs.count() > 0)` 가드 안에 유일한 탭 단언이 있어, **탭이 통째로 사라져도 그린**이었다
    //   (기능이 없어질수록 조용해지는 단언 — 이 저장소가 반복해서 제거해 온 형태다).
    //   남는 실단언은 제목 정규식 하나뿐이었는데, 그 화면(work-report)의 실질 거동은
    //   25-deptjob-workreport-journey 가 제목 검색·pageUnit·페이저 이동·행 수정/삭제까지
    //   서버 상태 폴링으로 검증하며 소유한다.
});
