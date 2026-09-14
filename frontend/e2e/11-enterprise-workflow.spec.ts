import { test, expect } from './fixtures/base-test';
import { createVisualAdmin } from './fixtures/visual-admin';
import fs from 'fs';
import path from 'path';

type ApprovalActor = Awaited<ReturnType<typeof createVisualAdmin>>;

// 결재자는 신청자와 다른 계정이어야 한다(DEC-OPS-095 — 자기 결재 금지). 일회용 관리자는 현재 관리자와
// 표시 이름이 같아(동명이인) 검색 결과 순서에 의존하지 않고 고유 ID 로 고르는 경로도 함께 검증한다.
const approvalTest = test.extend<{ approver: ApprovalActor }>({
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
    approvalTest('Workflow: 결재를 올리고 승인해 세 탭을 완주한다', async ({ page, request, browser, approver }) => {
        console.log('\n>>> Starting Workflow: Electronic Approval full lifecycle');
        const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
        const authPath = path.join(__dirname, '..', 'playwright', '.auth', 'admin.json');
        const authData = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
        const adminToken: string | undefined = authData.cookies.find((c: { name: string; value: string }) => c.name === 'accessToken')?.value;
        expect(adminToken, 'admin accessToken 이 storageState 에 있어야 한다').toBeTruthy();
        const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

        // 0. 업무 구분 코드 보장(COM075). 이미 있으면 등록은 실패해도 된다 — 아래 조회가 판정한다.
        const taskCode = 'E2ETASK';
        const taskName = 'E2E 업무';
        await request.post(`${API_BASE}/admin/system/codes/detail`, {
            headers,
            data: { cdId: 'COM075', dtlCd: taskCode, dtlCdNm: taskName, dtlCdExpln: 'e2e 결재 완주용', useYn: 'Y' },
        });
        const typesRes = await request.get(`${API_BASE}/approvals/task-types`, { headers });
        expect(typesRes.ok(), `task-types 조회 실패: ${typesRes.status()}`).toBeTruthy();
        const taskTypes: Array<{ dtlCd: string }> = (await typesRes.json()).data;
        expect(taskTypes.some((code) => code.dtlCd === taskCode), 'COM075 에 E2E 코드가 있어야 한다').toBeTruthy();

        // 결재자로 고를 내 표시 이름(피커는 성명으로만 검색한다).
        const meRes = await request.get(`${API_BASE}/users/me`, { headers });
        expect(meRes.ok()).toBeTruthy();
        const me: { userNm?: string; esntlId?: string } = (await meRes.json()).data;
        expect(me.userNm, '현재 사용자 표시 이름이 있어야 피커로 찾을 수 있다').toBeTruthy();
        expect(me.esntlId, '동명이인 중 본인을 식별할 고유 ID가 있어야 한다').toBeTruthy();
        expect(approver.esntlId, '결재자는 신청자와 다른 계정이어야 한다').not.toBe(me.esntlId);

        // 0-1. 자기 자신에게 올리는 상신은 서버가 거부한다(DEC-OPS-095).
        const selfDraft = await request.post(`${API_BASE}/approvals`, {
            headers,
            data: { taskSeCd: taskCode, aprvrId: me.esntlId, reqYmd: new Date().toISOString().slice(0, 10).replaceAll('-', '') },
        });
        expect(selfDraft.status(), '본인을 결재자로 지정한 상신은 400 이어야 한다').toBe(400);

        // 1. 결재 허브
        await page.goto('/approvals');
        await expect(page.getByRole('heading', { name: '결재 허브' }).first()).toBeVisible();

        // 2. 새 결재 기안 — 페이지 이동이 아니라 다이얼로그다(종전 link → button).
        await page.getByRole('button', { name: '새 결재 기안' }).click();
        const dialog = page.getByRole('dialog', { name: '새 결재 기안' });
        await expect(dialog).toBeVisible();

        // 3. 업무 구분 선택
        await dialog.locator('#approval-draft-task-type').click();
        await page.getByRole('option', { name: taskName }).click();

        // 4. 결재자 = 일회용 관리자. 표시 이름이 나와 같으므로 고유 ID 로 골라야 한다.
        await dialog.getByRole('button', { name: /결재자 선택/ }).click();
        const picker = page.getByRole('dialog', { name: '결재자 검색 및 선택' });
        await expect(picker).toBeVisible();
        await picker.getByLabel('사용자 검색어 입력').fill(me.userNm!);
        await picker.getByRole('button', { name: '검색' }).click();
        const sameNameUsers = picker.getByRole('button', { name: `사용자 선택: ${me.userNm}`, exact: true });
        await expect.poll(() => sameNameUsers.count(), { message: '동명이인이 있어도 지정한 결재자를 선택해야 한다' }).toBeGreaterThanOrEqual(2);
        await sameNameUsers.filter({ has: page.getByText(`ID: ${approver.esntlId}`, { exact: true }) }).click();
        await expect(dialog.getByTestId('approval-draft-approver')).toContainText(me.userNm!);

        // 5. 상신
        const [submittedRequest] = await Promise.all([
            page.waitForRequest((req) => req.method() === 'POST' && new URL(req.url()).pathname === '/api/v1/approvals'),
            dialog.getByRole('button', { name: '결재 상신' }).click(),
        ]);
        expect(submittedRequest.postDataJSON().aprvrId, '상신 결재자는 고른 결재자여야 한다').toBe(approver.esntlId);
        const submittedResponse = await submittedRequest.response();
        expect(submittedResponse?.ok(), '상신 요청이 저장되어야 한다').toBe(true);
        const approvalId: number = (await submittedResponse!.json()).data;
        expect(Number.isInteger(approvalId) && approvalId > 0, '저장된 결재 번호가 있어야 한다').toBe(true);
        await expect(page.getByText('결재를 상신했습니다', { exact: false })).toBeVisible();
        await expect(dialog).toBeHidden();

        // 6. '내가 올린 결재' 로 자동 전환되고 방금 올린 건이 보인다.
        await expect(page.getByRole('tab', { name: '내가 올린 결재' })).toHaveAttribute('aria-selected', 'true');
        // 같은 업무 구분의 과거 결재가 있어도 이번 상신 번호만 따라간다.
        const approvalItem = page.getByTestId('approval-item').filter({
            has: page.getByRole('button', { name: `${taskName} #${approvalId} 상세 열기`, exact: true }),
        });
        await expect(approvalItem).toBeVisible();
        await expect(approvalItem.getByText('대기 중')).toBeVisible();

        // 신청자의 대기함에는 이 결재가 없다 — 결재자가 아니기 때문이다.
        await page.getByRole('tab', { name: '대기 중인 결재' }).click();
        await expect(approvalItem).toHaveCount(0);

        // 7. 결재자의 세션으로 대기함에서 승인한다.
        const approverContext = await browser.newContext({ storageState: approver.storageState, viewport: { width: 1920, height: 1080 } });
        try {
            const approverPage = await approverContext.newPage();
            await approverPage.goto('/approvals');
            await expect(approverPage.getByRole('heading', { name: '결재 허브' }).first()).toBeVisible();
            await approverPage.getByRole('tab', { name: '대기 중인 결재' }).click();
            const pendingItem = approverPage.getByTestId('approval-item').filter({
                has: approverPage.getByRole('button', { name: `${taskName} #${approvalId} 상세 열기`, exact: true }),
            });
            await expect(pendingItem).toBeVisible();
            await pendingItem.getByRole('button').click();
            await approverPage.getByRole('button', { name: '결재 승인' }).click();
            await approverPage.getByRole('dialog').getByRole('button', { name: '확인', exact: true }).click();
            await expect(approverPage.getByText('성공적으로 승인되었습니다.')).toBeVisible();

            // 8. 결재자의 '내가 처리한 결재' 에 승인 완료로 남는다 — 종전에는 이 목록을 볼 탭이 없었다.
            await approverPage.getByRole('tab', { name: '내가 처리한 결재' }).click();
            await expect(pendingItem).toBeVisible();
            await expect(pendingItem.getByText('승인 완료')).toBeVisible();
        } finally {
            await approverContext.close();
        }

        // 9. 신청자의 '내가 올린 결재' 에도 승인 완료로 보인다.
        await page.reload();
        await page.getByRole('tab', { name: '내가 올린 결재' }).click();
        await expect(approvalItem.getByText('승인 완료')).toBeVisible();

        // 10. 회귀 차단 — 종전의 가짜 성공 문구·목업 라우트로의 이동이 되살아나면 red 다.
        await expect(page.locator('text=결재 상신이 완료되었습니다')).toHaveCount(0);
        await expect(page).toHaveURL(/\/approvals$/);
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
