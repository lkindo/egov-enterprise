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
        // Initial tab is WORKFLOW as per page.tsx
        await expect(page.getByText('워크플로우 배포 관리')).toBeVisible();
        
        // Switch to FORMS tab
        await workflowPage.switchTab('FORMS');
        await expect(page.getByText('결재 양식 인벤토리')).toBeVisible();
        
        // Engine status should be visible in all tabs as it's in the sidebar
        await expect(page.getByText('Engine Healthy')).toBeVisible();
        await expect(page.getByText('99.9% Uptime')).toBeVisible();

        // Switch to Monitor tab
        await workflowPage.switchTab('MONITOR');
        await expect(page.getByText('시스템 상태')).toBeVisible({ timeout: 10000 });
    });

    test('should select an approval form and verify the designer logic preview', async ({ page }) => {
        await workflowPage.switchTab('FORMS');
        const targetForm = '일반 지출 결의서';
        
        // Select form from inventory
        await workflowPage.selectForm(targetForm);
        
        // Verify designer preview on the right
        await workflowPage.verifyDesignerVisible(targetForm);
        
        // Check specific nodes in the designer (Mock data from WorkflowHubClient)
        await expect(page.getByText('기안자')).toBeVisible();
        await expect(page.getByText('Dept. 관리자')).toBeVisible();
        await expect(page.getByRole('heading', { name: '시스템' })).toBeVisible();
    });

    // [E2E 감사 A1] 삭제됨: 'should trigger workflow deployment process' — deployWorkflow()가 배포 버튼의
    // enabled 여부만 확인하고 클릭 후 결과(토스트/상태전이/네트워크)를 전혀 단언하지 않던 무단언 테스트.
    // 실제 배포 성공 신호는 서버 기동 후 상태 배지/토스트로 재작성 검증 예정.
});
