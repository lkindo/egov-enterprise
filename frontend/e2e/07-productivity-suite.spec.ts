import { test, expect } from './fixtures/base-test';
import { ProductivitySuitePage } from './pages/ProductivitySuitePage';

/**
 * Tier 7: Productivity Suite
 * 협업과 행정 처리를 위한 내부 업무용 모듈 검증 (전자결재, 조직도, 일정)
 */
test.describe('Tier 7: Productivity Suite (Business Tools)', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('Electronic Approval (Workflow State Machine)', async ({ adminPage }) => {
        const prodPage = new ProductivitySuitePage(adminPage);

        await test.step('Admin: Navigate to Approval Forms', async () => {
            await prodPage.gotoApproval();
        });

        await test.step('Admin: Verify Form UI Load', async () => {
            await prodPage.verifyApprovalStateTransition();
        });
        // [E2E 감사 A1] 삭제됨: 'Simulate Approval State Transition' — page.route로 {currentState:'APPROVED'}를
        // 스스로 주입한 뒤 그 stub JSON을 단언하는 자기충족 목. 실제 승인 상태전이는 Phase4 신규 테스트(11 소유)에서
        // 목 없이 실 PUT .../confirm으로 검증한다.
    });

    test('Organization Chart & Address Book (Permission & Navigation)', async ({ adminPage }) => {
        const prodPage = new ProductivitySuitePage(adminPage);

        await test.step('Admin: Navigate to Address Book', async () => {
            await prodPage.gotoAddressBook();
        });

        await test.step('Admin: Verify Org Chart & User Tree', async () => {
            await prodPage.verifyOrgChartNavigation();
        });
        // [E2E 감사 A1] 삭제됨: 'Simulate Organization Sync' — page.route로 inheritedRoles를 스스로 주입한 뒤
        // 그 stub을 단언하는 자기충족 목. 실제 부서 이동·권한 상속은 백엔드 통합 테스트에서 검증한다.
    });

    test('Calendar Management (Schedule Sync & Overlap Check)', async ({ adminPage }) => {
        const prodPage = new ProductivitySuitePage(adminPage);

        await test.step('Admin: Navigate to Calendar/Work Hub', async () => {
            await prodPage.gotoCalendar();
        });

        await test.step('Admin: Verify Calendar Component Render', async () => {
            await prodPage.verifyCalendarSynchronization();
        });
        // [E2E 감사 A1] 삭제됨: 'Simulate Schedule Overlap Exception' — page.route로 409를 스스로 주입한 뒤
        // 그 409를 단언하는 자기충족 목. 실제 일정 중복 충돌은 백엔드 통합 테스트에서 검증한다.
    });

    test('Smart Toolkit: Business Extensions (Dept Job & Work Report)', async ({ adminPage }) => {
        const prodPage = new ProductivitySuitePage(adminPage);

        await test.step('Admin: Navigate and Verify Departmental Jobs', async () => {
            await prodPage.gotoDeptJob();
            await prodPage.verifyWorkflowHubTabs();
            // In Workflow Hub, the job list is visible by default for Dept Job
            await expect(adminPage.getByText(/식별된 데이터 유닛이 없습니다|부서: /i).first()).toBeVisible();
        });

        await test.step('Admin: Navigate and Verify Work Reports', async () => {
            await prodPage.gotoWorkReport();
            await prodPage.verifyWorkflowHubTabs();
            // In Workflow Hub, the report list is visible by default for Work Report
            await expect(adminPage.getByText(/식별된 데이터 유닛이 없습니다|작성자: /i).first()).toBeVisible();
        });
    });
});
