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
        await expect(page.getByText('Global API Traffic')).toBeVisible();
        await expect(page.getByText('System Latency')).toBeVisible();
        await expect(page.getByText('Error Rate')).toBeVisible();
        await expect(page.getByText('Node Utilization')).toBeVisible();
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
});
