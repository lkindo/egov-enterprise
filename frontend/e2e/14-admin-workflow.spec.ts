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
        // 이 경로는 실제 워크플로우 엔진이 아니라 정적 데모다. 샘플 데이터를 운영 데이터로
        // 오인시키는 문구가 되돌아오지 않도록 **고지 자체**를 단언한다.
        // [2026-08-26] 종전에는 헤더 subtitle 문구도 함께 봤지만, 페이지 헤더 두 겹을 하나로
        //   합치면서 그 subtitle 은 사라졌다. 같은 사실을 더 강하게 말하는 status 고지가 남아
        //   있으므로 그쪽을 계약으로 삼는다(정보는 사라지지 않았다).
        const demoNotice = page.getByRole('status').filter({ hasText: '정적 데모 화면입니다.' });
        await expect(demoNotice).toBeVisible();
        await expect(demoNotice).toContainText('실제 저장·실행·운영 지표를 제공하지 않습니다');

        // [2026-09-02] 고지가 **실제 결재 능력의 범위**까지 말하는지 함께 고정한다.
        //   "데모다" 만 말하면 읽는 사람은 진짜 엔진이 전자결재함 쪽에 있다고 읽는다 —
        //   캔버스가 4단계 결재선을 그리고 있으니 더욱 그렇다. 실제 구현은 결재자 1인의
        //   승인/반려 단일 단계이고 결재선·대결·회수가 없다.
        await expect(demoNotice).toContainText('결재자 1인의 승인·반려 단일 단계');

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
