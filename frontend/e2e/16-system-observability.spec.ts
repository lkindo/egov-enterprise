import { test, expect } from './fixtures/base-test';
import { ObservabilityPage } from './pages/ObservabilityPage';

test.describe('Tier 16: System Observability & Intelligence', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    let obsPage: ObservabilityPage;

    test.beforeEach(async ({ page }) => {
        obsPage = new ObservabilityPage(page);
        await obsPage.navigate();
    });

    test('should verify real-time system metrics and header', async () => {
        await obsPage.verifyHeader();
        await obsPage.verifyMetrics();
        
        // Verify specific metrics are visible
        const page = obsPage['page'];
        // 모니터링 허브 observability 탭의 실제 지표 라벨 (구 standalone 페이지 라벨은 라우트 통합으로 제거됨)
        await expect(page.getByText('CPU_LOAD', { exact: false }).first()).toBeVisible();
        await expect(page.getByText('MEMORY_ALLOC', { exact: false }).first()).toBeVisible();
        await expect(page.getByText('NETWORK_TRAFFIC', { exact: false }).first()).toBeVisible();
    });

    test('should verify system topology visualization', async () => {
        await obsPage.verifyTopology();
    });

    test('should trigger live synchronization and data export', async () => {
        await obsPage.refresh();
        await obsPage.exportData();
        
        // exportData()가 연 '리포트 스냅샷' 모달 검증 (허브 실제 UI — 구 footer 브랜딩은 라우트 통합으로 제거됨)
        const page = obsPage['page'];
        await expect(page.getByText('Intelligence Report Generator')).toBeVisible();
    });

    test('should verify advanced analytics: visitor and word statistics', async ({ page }) => {
        console.log('>>> [Observability] Navigating to Visitor Stats');
        await page.goto('/admin/stats/user');
        await expect(page.getByText(/사용자 통계 분석/i)).toBeVisible({ timeout: 15000 });
        
        console.log('>>> [Observability] Navigating to Content Stats');
        await page.goto('/admin/stats/board');
        await expect(page.getByText(/콘텐츠 지표 분석/i)).toBeVisible({ timeout: 15000 });
    });
});
