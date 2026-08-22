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
        // 이 경로는 실제 워크플로우 엔진이 아니라 정적 데모다. 현재 subtitle과 명시적 status 고지를
        // 함께 확인해 샘플 데이터를 운영 데이터로 오인시키는 과거 문구가 되돌아오지 않게 한다.
        await expect(page.getByText(
            '정적 예시 데이터로 워크플로우 캔버스의 형태와 탐색 동작만 확인합니다.',
            { exact: true },
        )).toBeVisible();
        await expect(page.getByRole('status').filter({ hasText: '정적 데모 화면입니다.' })).toBeVisible();

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
