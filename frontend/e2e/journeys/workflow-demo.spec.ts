import { expect,test } from '../fixtures/browser-test';
import { ProductivitySuitePage } from '../pages/ProductivitySuitePage';
import { WorkflowAdminPage } from '../pages/WorkflowAdminPage';
test.describe('결재 양식 데모', () => {
    /**
     * Productivity Suite
     * 협업과 행정 처리를 위한 내부 업무용 모듈 검증 (전자결재, 주소록, 일정)
     */
    test.describe('Productivity Suite (Business Tools)', () => {
        test.use({ viewport: { width: 1920, height: 1080 } });
        test("결재 양식 데모 화면의 제목을 표시한다", async ({ adminPage }) => {
            const prodPage = new ProductivitySuitePage(adminPage);
            await test.step('Admin: Navigate to Approval Forms', async () => {
                await prodPage.gotoApproval();
            });
            await test.step('Admin: Verify Form UI Load', async () => {
                await prodPage.verifyApprovalFormHeading();
            });
        });
    });
});
test.describe('프로세스 캔버스 데모', () => {
    // Route consolidation: /admin/sanctn/workflow now redirects (next.config.ts) to /admin/workflow,
    // which renders WorkflowClient ("프로세스 설계 및 관제" Process Studio). The legacy tab/form/engine
    // hub (WorkflowHubClient) is no longer reachable at this route, so this tier was realigned to the
    // canvas-based studio: hub metrics + WorkflowCanvas node selection driving the Node Intelligence panel.
    test.describe('Administrative Workflow Management', () => {
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
            // 실제 결재함의 다단계 기능과 이 캔버스의 정적 데모 범위를 구분한다.
            await expect(demoNotice).toContainText('전자결재함에서는 다단계 승인·합의와 반려·재상신을 처리합니다.');
            await expect(demoNotice).toContainText('이 캔버스의 단계·담당자 편집은 실제 결재선에 반영되지 않습니다.');
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
    });
});
