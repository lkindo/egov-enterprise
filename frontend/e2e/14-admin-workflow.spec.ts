import { test, expect } from './fixtures/base-test';
import { WorkflowAdminPage } from './pages/WorkflowAdminPage';

// Route consolidation: /admin/sanctn/workflow now redirects (next.config.ts) to /admin/workflow,
// which renders WorkflowClient ("프로세스 설계 및 관제" Process Studio). The legacy tab/form/engine
// hub (WorkflowHubClient) is no longer reachable at this route, so this tier was realigned to the
// canvas-based studio: hub metrics + WorkflowCanvas node selection driving the Node Intelligence panel.
test.describe('Tier 14: Administrative Workflow Management', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    let workflowPage: WorkflowAdminPage;

    test.beforeEach(async ({ page }) => {
        workflowPage = new WorkflowAdminPage(page);
        await workflowPage.goto();
    });

    test('should render the process studio hub with metrics and canvas', async ({ page }) => {
        // HubHeader subtitle uniquely identifies the studio shell.
        await expect(page.getByText('실시간 이벤트 기반 워크플로우를 설계하고 비즈니스 로직을 시각화합니다.')).toBeVisible();

        // Hub metric cards + canvas/panel section cards.
        await workflowPage.verifyHubLoaded();

        // Active-process context label rendered above the canvas.
        await expect(page.getByText('연차/휴가 결재 v1.2')).toBeVisible();
    });

    test('should update the node intelligence panel when a canvas node is selected', async () => {
        // WorkflowClient mounts with node #3 ('팀장 검토 및 승인') pre-selected in the panel.
        await workflowPage.verifyNodeIntelligence('팀장 검토 및 승인');

        // Selecting a different canvas node updates the Node Intelligence panel.
        await workflowPage.selectNode('신청서 작성 및 제출');
        await workflowPage.verifyNodeIntelligence('신청서 작성 및 제출');
    });

    // [E2E 감사 A1] 삭제된 채 유지: 'should trigger workflow deployment process' — deployWorkflow()가 배포 버튼의
    // enabled 여부만 확인하던 무단언 테스트였고, 통합된 목적지(WorkflowClient)에는 배포 버튼 자체가 없다.
    // 배포/상태전이 검증은 실제 워크플로우 실행 API가 UI에 연결된 뒤 재작성 예정.
});
