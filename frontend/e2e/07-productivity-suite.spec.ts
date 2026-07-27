import { test, expect } from './fixtures/base-test';
import { ProductivitySuitePage } from './pages/ProductivitySuitePage';
import { getAdminBearerToken } from './utils/admin-token';

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

    test('Smart Toolkit: Business Extensions (Dept Job & Work Report)', async ({ adminPage, request }) => {
        const prodPage = new ProductivitySuitePage(adminPage);

        // [2026-07-27 정정] 종전 단언은 `/식별된 데이터 유닛이 없습니다|부서: /` 였다. 실패 원인은 앱 회귀가
        // 아니라 **테스트 드리프트**다 — 업무 탭에 소유 스코프('내 업무'/'부서 전체')가 생기면서 기본
        // 스코프의 빈 문구가 "내가 담당자인 업무가 없습니다…"로 분기됐고(WorkHubClient §emptyMessage),
        // 낡은 문구는 그 분기 밖에만 남았다. 즉 종전 테스트는 **빈 목록만 통과**하는 단언이었다.
        // 빈 화면을 단언하는 대신 이 테스트가 쓸 업무를 **직접 만들어** 목록에 실제로 뜨는지 검증한다
        // (시드로 풀면 누적 쓰레기가 재발한다 — 04 스펙의 자체생성 전환과 동일 방침).
        // 백엔드는 담당자 미지정 시 등록자를 담당자(pic_id = esntlId)로 넣으므로 기본 '내 업무'에 잡힌다.
        const token = getAdminBearerToken();
        const jobName = `E2E DeptJob ${Date.now()}`;
        let createdJobId = '';

        await test.step('Admin: Navigate and Verify Departmental Jobs', async () => {
            const created = await request.post('/api/v1/dept-jobs', {
                headers: { Authorization: `Bearer ${token}` },
                data: { deptTaskNm: jobName, deptTaskCn: '부서 업무 목록 렌더 검증용 업무', prrtyRnk: '1' },
            });
            expect(created.ok(), '검증용 부서 업무 생성이 성공해야 한다').toBeTruthy();
            createdJobId = String((await created.json())?.data ?? '').trim();
            expect(createdJobId, '생성된 부서 업무 ID 를 받아야 한다').not.toBe('');

            await prodPage.gotoDeptJob();
            await prodPage.verifyWorkflowHubTabs();
            // 기본 스코프('내 업무')에 방금 만든 업무가 실제로 렌더되어야 한다.
            await expect(adminPage.getByText(jobName).first()).toBeVisible({ timeout: 15000 });
        });

        // cleanup-db.ts 는 부서 업무를 청소하지 않는다(대상 목록에 없음). 자체 생성분은 직접 회수한다.
        await test.step('Cleanup: remove the dept job created by this test', async () => {
            const deleted = await request.delete(`/api/v1/dept-jobs/${createdJobId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            expect(deleted.ok(), '검증용 부서 업무 삭제가 성공해야 한다').toBeTruthy();
        });

        await test.step('Admin: Navigate and Verify Work Reports', async () => {
            await prodPage.gotoWorkReport();
            await prodPage.verifyWorkflowHubTabs();
            // In Workflow Hub, the report list is visible by default for Work Report
            await expect(adminPage.getByText(/식별된 데이터 유닛이 없습니다|작성자: /i).first()).toBeVisible();
        });
    });
});
