import { expect,test } from '../fixtures/browser-test';
import { getAdminBearerToken } from '../utils/admin-token';
test.describe('Operational Extension & Uncovered Modules', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    /**
     * [2026-09-05 DEC-OPS-036] 포상 정정 경로 — 종전에는 등록만 되고 고칠 수 없었다(감사 D11-01).
     * API 로 만든 기록을 화면에서 찾아 이름을 고치고, 삭제까지 완주한다.
     */
    test("포상 검색 결과 건수를 표시하고 수정·삭제를 반영한다", async ({ operationalPage, request }) => {
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
        await expect(operationalPage.page.getByTestId('work-list-toolbar')).toContainText('총');
        await expect(operationalPage.page.getByText(originalName)).toBeVisible();
        await operationalPage.renameReward(originalName, renamed);
        await operationalPage.searchRewards(renamed);
        await expect(operationalPage.page.getByText(renamed)).toBeVisible();
        await operationalPage.deleteReward(renamed);
        await operationalPage.searchRewards(renamed);
        // 표의 '결과 없음' 문구는 검색어를 그대로 싣는다(G15: "<검색어>"에 대한 검색 결과가 없습니다).
        //   부분 일치 getByText 는 그 문구에 걸려 count 1 이었다(CI run 33980097374) — 이름 셀은 정확 일치로만 센다.
        await expect(operationalPage.page.getByText(/에 대한 검색 결과가 없습니다/)).toBeVisible();
        await expect(operationalPage.page.getByText(renamed, { exact: true })).toHaveCount(0);
    });
});
