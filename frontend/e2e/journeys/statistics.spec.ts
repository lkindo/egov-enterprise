import { expect,test } from '../fixtures/browser-test';
test.describe('협업 도구', () => {
    /**
     * Advanced Collaboration & Intelligence
     * 실제 UI 상호작용을 통한 협업 도구 및 지능형 분석 기능 검증
     */
    test.describe('Advanced Collaboration & Intelligence', () => {
        test.use({
            storageState: 'playwright/.auth/admin.json',
            viewport: { width: 1920, height: 1080 }
        });
        test("접속 통계 차트를 새로고침하고 CSV를 내려받는다", async ({ statsPage }) => {
            console.log('\n>>> Starting Intelligence: Dashboard Validation');
            await statsPage.goto();
            await statsPage.verifyChartsVisible();
            // [2026-07-27] 종전의 `changePeriod('MONTHLY_BATCH (30D)')` 를 걷어냈다 — 그 셀렉트는
            // onChange 없는 장식 컨트롤이었고 감사 P0(4dcee3014)에서 제거됐다. 상세는 StatsPage 주석.
            await statsPage.refresh();
            // 엑셀 내보내기 검증
            console.log('>>> Verifying Excel Export capability');
            const download = await statsPage.exportExcel();
            // [2026-07-27 정정] 기대 파일명이 'system_intelligence_stats' 로 굳어 있었으나 실제 산출물은
            // `system_connect_stats_YYYY-MM-DD.csv` 다(AdminStatsClient 의 DataExportExcel filename).
            // 접속 집계를 내보내는 버튼이므로 현행 이름이 내용과 더 맞는다 — 단언을 실물에 맞춘다.
            expect(download.suggestedFilename()).toContain('system_connect_stats');
        });
    });
});
test.describe('운영 관측', () => {
    test.describe('System Observability & Intelligence', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });
        test("사용자 통계와 콘텐츠 지표 화면 제목을 표시한다", async ({ page }) => {
            console.log('>>> [Observability] Navigating to Visitor Stats');
            await page.goto('/admin/stats/user');
            await expect(page.getByRole('heading', { level: 1, name: '사용자 통계 분석', exact: true })).toBeVisible({ timeout: 15000 });
            console.log('>>> [Observability] Navigating to Content Stats');
            await page.goto('/admin/stats/board');
            await expect(page.getByRole('heading', { level: 1, name: '콘텐츠 지표 분석', exact: true })).toBeVisible({ timeout: 15000 });
        });
    });
});
