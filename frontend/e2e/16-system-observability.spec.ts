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
        await expect(page.getByText('글로벌 트래픽', { exact: false }).first()).toBeVisible();
        await expect(page.getByText('시스템 지연시간', { exact: false }).first()).toBeVisible();
        await expect(page.getByText('에러 발생률', { exact: false }).first()).toBeVisible();
        await expect(page.getByText('노드 부하율', { exact: false }).first()).toBeVisible();
    });

    test('should verify system topology visualization', async () => {
        await obsPage.verifyTopology();
    });

    test('should trigger live synchronization and data export', async () => {
        await obsPage.refresh();
        await obsPage.exportData();
        
        // Verify footer branding
        const page = obsPage['page'];
        await expect(page.getByText(/Observability Engine v5.0.0/)).toBeVisible();
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
