import { test, expect } from './fixtures/base-test';
import { getAdminBearerToken } from './utils/admin-token';
import path from 'path';

test.describe('Tier 10: Operational Extension & Uncovered Modules', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test.beforeEach(async ({ page }) => {
        // Ensure we are logged in - using the authenticated state
        await page.goto('/');
    });

    test('Operational: Reward and Honor Management Lifecycle', async ({ operationalPage }) => {
        await operationalPage.gotoRewards();
        
        // Search
        await operationalPage.searchRewards('test');
        
        // [2026-08-24 A1 이행] 실데이터 파생 지표 카드 2종('포상 현황'·'활성 레코드')은
        //   WorkListPage 결과 툴바의 총 건수 한 곳으로 수렴했다(카탈로그 G3 — 총 건수 단일 출처).
        //   검증 의도는 그대로다: 조회 뒤에도 집계가 화면에 남아 있는가.
        await expect(operationalPage.page.getByTestId('work-list-toolbar')).toContainText('총');
    });

    /**
     * [2026-09-05 DEC-OPS-036] 포상 정정 경로 — 종전에는 등록만 되고 고칠 수 없었다(감사 D11-01).
     * API 로 만든 기록을 화면에서 찾아 이름을 고치고, 삭제까지 완주한다.
     */
    test('Operational: Reward edit and delete round-trip', async ({ operationalPage, request }) => {
        const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
        // [2026-09-06] storageState 는 frontend/playwright/.auth 에 있다(auth.setup 의 path.resolve 기준 = cwd frontend).
        //   __dirname(frontend/e2e) 기준 경로는 CI 에서 ENOENT 였다(run 33977944030) — 공용 헬퍼가 정본 경로를 안다.
        const adminToken = getAdminBearerToken();
        const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

        const stamp = Date.now();
        const originalName = `E2E 포상 ${stamp}`;
        const renamed = `E2E 포상 정정 ${stamp}`;
        const created = await request.post(`${API_BASE}/admin/operation/rewards`, {
            headers,
            data: { rwardNm: originalName, rwardwnrId: 'E2E_USER', rwardCode: 'E2E', rwardDe: '20260905', pblenCn: 'e2e 정정 경로 검증', confmAt: 'N' },
        });
        expect(created.ok(), `포상 등록 실패: ${created.status()}`).toBeTruthy();

        await operationalPage.gotoRewards();
        await operationalPage.searchRewards(originalName);
        await expect(operationalPage.page.getByText(originalName)).toBeVisible();

        await operationalPage.renameReward(originalName, renamed);
        await operationalPage.searchRewards(renamed);
        await expect(operationalPage.page.getByText(renamed)).toBeVisible();

        await operationalPage.deleteReward(renamed);
        await operationalPage.searchRewards(renamed);
        await expect(operationalPage.page.getByText(renamed)).toHaveCount(0);
    });

    test('Operational: External HR Information Management', async ({ operationalPage }) => {
        await operationalPage.gotoExternalHr();
        
        // Search
        await operationalPage.searchExternalHr('홍길동');
        
        // Verify button
        await expect(operationalPage.page.getByRole('button', { name: '인사 등록' })).toBeVisible();
    });

    test('Operational: Memo Report Matrix & Interaction', async ({ operationalPage }) => {
        await operationalPage.gotoMemoReports();

        // 탭 전환 — 각 전환 뒤 허브가 살아 있는지 확인한다.
        // [2026-08-10 정정] 종전에는 마지막에 `const noData = …isVisible(); if (noData) console.log(…)`
        //   뿐이었다. 즉 **단언이 하나도 없는 꼬리**였다: 빈 상태든 아니든, 심지어 화면이 깨져도
        //   그 블록은 아무것도 실패시키지 않는다. 죽은 분기를 지우고, 탭 전환 후에도 허브가
        //   유지되는지를 실제로 단언한다(전환 중 언마운트·크래시가 나면 여기서 red 가 된다).
        //   ⚠ 이것은 스모크다 — '어느 탭이 활성인가'나 '데이터가 맞는가'는 검증하지 않는다.
        //     그 이상을 주장하지 않기 위해 단언 범위를 명시해 둔다.
        for (const tab of ['발신함', '전체', '수신함']) {
            await operationalPage.switchReportTab(tab);
            await expect(
                operationalPage.page.getByRole('heading', { name: '메모 보고 관리', exact: true }),
                `'${tab}' 탭 전환 후 메모 보고 허브가 사라졌다`,
            ).toBeVisible();
        }
    });


    test('Communication: SMS Protocol & Transmission', async ({ operationalPage }) => {
        await operationalPage.gotoSms();
        
        // Send SMS (Mock/Real check)
        // We use a dummy number to test the UI flow and toast
        await operationalPage.sendSms('010-9999-8888', 'E2E Test Message from Antigravity');
    });

});
