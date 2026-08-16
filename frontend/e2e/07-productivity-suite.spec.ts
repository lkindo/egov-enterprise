import { test } from './fixtures/base-test';
import { ProductivitySuitePage } from './pages/ProductivitySuitePage';

/**
 * Tier 7: Productivity Suite
 * 협업과 행정 처리를 위한 내부 업무용 모듈 검증 (전자결재, 주소록, 일정)
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

    test('Address Book (Permission & Navigation)', async ({ adminPage }) => {
        const prodPage = new ProductivitySuitePage(adminPage);

        await test.step('Admin: Navigate to Address Book', async () => {
            await prodPage.gotoAddressBook();
        });

        await test.step('Admin: Verify Address Book Controls', async () => {
            await prodPage.verifyAddressBookNavigation();
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

    // [2026-08-10 중복제거] 삭제됨: 'Smart Toolkit: Business Extensions (Dept Job & Work Report)'.
    //
    //   25-deptjob-workreport-journey 가 이 도메인 전체를 8건으로 소유한다. 그 스펙은
    //   '부서 업무 목록은 업무함(box)이 아니라 부서 업무(DeptJob)를 보여준다' 에서
    //   **API 로 업무를 만들고 → 목록에서 찾고 → 행의 링크가 그 업무의 상세로 향하는지까지** 검증한다.
    //   여기서 하던 "만들고 → 목록에 보이는지"는 그 앞부분과 정확히 같으면서 더 약했다.
    //
    //   업무 보고 쪽 단언(`/식별된 데이터 유닛이 없습니다|작성자: /`)은 **빈 목록도 통과**하는 or-폴백이라
    //   회귀 탐지력이 없었다. 25 는 같은 화면을 페이저·행 수정/삭제·서버 반영까지 실단언으로 고정한다.
    //
    //   ※ 이 테스트만 `getAdminBearerToken` 을 쓰고 있었다 — 삭제와 함께 import 도 회수한다.
});
