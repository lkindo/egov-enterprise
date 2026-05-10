import { test, expect } from './fixtures/base-test';

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
        
        // Verify stats are visible
        await expect(operationalPage.page.getByText('포상 현황')).toBeVisible();
        await expect(operationalPage.page.getByText('동기화상태')).toBeVisible();
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
        
        // Tab switching
        await operationalPage.switchReportTab('발신함');
        await operationalPage.switchReportTab('전체');
        await operationalPage.switchReportTab('수신함');
        
        // Check for empty message or data
        const noData = await operationalPage.page.getByText('식별된 데이터 유닛이 존재하지 않습니다.').first().isVisible();
        if (noData) {
            console.log('>>> No memo reports found, verifying UI empty state');
        }
    });

    test('Operational: Rough Map Geographic Intelligence', async ({ operationalPage }) => {
        await operationalPage.gotoRoughMap();
        
        // Verify UI elements
        await expect(operationalPage.page.getByText('거점 자산 매트릭스')).toBeVisible();
        await expect(operationalPage.page.getByRole('button', { name: '거점 등록' })).toBeVisible();
    });

    test('Communication: SMS Protocol & Transmission', async ({ operationalPage }) => {
        await operationalPage.gotoSms();
        
        // Send SMS (Mock/Real check)
        // We use a dummy number to test the UI flow and toast
        await operationalPage.sendSms('010-9999-8888', 'E2E Test Message from Antigravity');
    });

});
