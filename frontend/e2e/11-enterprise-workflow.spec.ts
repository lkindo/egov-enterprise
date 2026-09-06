import { test, expect } from './fixtures/base-test';
import fs from 'fs';
import path from 'path';

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
     * 내가 처리한)이 각각 자기 축의 API 를 부른다. 결재자를 **자기 자신**으로 고르면 한 계정으로
     * 상신 → 대기함 → 승인 → 처리함까지 완주할 수 있다.
     *
     * ⚠ 업무 구분은 공통코드 COM075 의 상세코드다. 시드에는 상세코드가 없으므로(PD-DB-003 — 원천
     *   없는 임의 시드 금지) 테스트가 관리자 API 로 코드 하나를 보장한 뒤 시작한다. 이미 있으면
     *   등록 응답은 실패해도 되고, 실제 판정은 `/approvals/task-types` 가 그 코드를 돌려주는지다.
     */
    test('Workflow: 결재를 올리고 승인해 세 탭을 완주한다', async ({ page, request }) => {
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
        const me: { userNm?: string } = (await meRes.json()).data;
        expect(me.userNm, '현재 사용자 표시 이름이 있어야 피커로 찾을 수 있다').toBeTruthy();

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

        // 4. 결재자 = 나 자신(한 계정으로 완주하기 위해)
        await dialog.getByRole('button', { name: /결재자 선택/ }).click();
        const picker = page.getByRole('dialog', { name: '결재자 검색 및 선택' });
        await expect(picker).toBeVisible();
        await picker.getByLabel('사용자 검색어 입력').fill(me.userNm!);
        await picker.getByRole('button', { name: '검색' }).click();
        await picker.getByRole('button', { name: `사용자 선택: ${me.userNm}` }).first().click();
        await expect(dialog.getByTestId('approval-draft-approver')).toContainText(me.userNm!);

        // 5. 상신
        await dialog.getByRole('button', { name: '결재 상신' }).click();
        await expect(page.getByText('결재를 상신했습니다', { exact: false })).toBeVisible();
        await expect(dialog).toBeHidden();

        // 6. '내가 올린 결재' 로 자동 전환되고 방금 올린 건이 보인다.
        await expect(page.getByRole('tab', { name: '내가 올린 결재' })).toHaveAttribute('aria-selected', 'true');
        const submittedItem = page.getByTestId('approval-item').filter({ hasText: taskName }).first();
        await expect(submittedItem).toBeVisible();
        await expect(submittedItem.getByText('대기 중')).toBeVisible();

        // 7. 결재자(=나)의 대기함에서 승인
        await page.getByRole('tab', { name: '대기 중인 결재' }).click();
        const pendingItem = page.getByTestId('approval-item').filter({ hasText: taskName }).first();
        await pendingItem.getByRole('button').click();
        await page.getByRole('button', { name: '결재 승인' }).click();
        await page.getByRole('dialog').getByRole('button', { name: '확인', exact: true }).click();
        await expect(page.getByText('성공적으로 승인되었습니다.')).toBeVisible();

        // 8. '내가 처리한 결재' 에 승인 완료로 남는다 — 종전에는 이 목록을 볼 탭이 없었다.
        await page.getByRole('tab', { name: '내가 처리한 결재' }).click();
        const processedItem = page.getByTestId('approval-item').filter({ hasText: taskName }).first();
        await expect(processedItem).toBeVisible();
        await expect(processedItem.getByText('승인 완료')).toBeVisible();

        // 9. 회귀 차단 — 종전의 가짜 성공 문구·목업 라우트로의 이동이 되살아나면 red 다.
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
