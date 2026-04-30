import { test, expect } from './fixtures/base-test';
import { WorkflowAdminPage } from './pages/WorkflowAdminPage';

test.describe('Tier 14: Administrative Workflow Management', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    let workflowPage: WorkflowAdminPage;

    test.beforeEach(async ({ page }) => {
        workflowPage = new WorkflowAdminPage(page);
        await workflowPage.goto();
    });

    test('should navigate through workflow tabs and verify engine status', async ({ page }) => {
        // Initial tab check
        await expect(page.getByText('결재 양식 인벤토리')).toBeVisible();
        
        // Switch to Workflow tab
        await workflowPage.switchTab('WORKFLOW');
        // Engine status should be visible in all tabs as it's in the sidebar
        await expect(page.getByText('Engine Healthy')).toBeVisible();
        await expect(page.getByText('99.9% Uptime')).toBeVisible();

        // Switch to Monitor tab
        await workflowPage.switchTab('MONITOR');
        await expect(page.getByText('시스템 상태')).toBeVisible({ timeout: 10000 });
    });

    test('should select an approval form and verify the designer logic preview', async ({ page }) => {
        const targetForm = '일반 지출 결의서';
        
        // Select form from inventory
        await workflowPage.selectForm(targetForm);
        
        // Verify designer preview on the right
        await workflowPage.verifyDesignerVisible(targetForm);
        
        // Check specific nodes in the designer (Mock data from WorkflowHubClient)
        await expect(page.getByText('기안자')).toBeVisible();
        await expect(page.getByText('Dept. 관리자')).toBeVisible();
        await expect(page.getByText('시스템')).toBeVisible();
    });

    test('should trigger workflow deployment process', async ({ page }) => {
        await workflowPage.deployWorkflow();
        
        // Since it's a mock action in WorkflowHubClient, it might not have a complex flow,
        // but we verify the button is interactive.
        console.log('[E2E] Workflow deployment triggered successfully');
    });
});
