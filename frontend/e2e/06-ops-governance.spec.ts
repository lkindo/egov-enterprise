import { test } from './fixtures/base-test';
import { OpsGovernancePage } from './pages/OpsGovernancePage';

/**
 * Tier 6: Ops Governance
 * 시스템의 보안과 운영 효율성을 극대화하는 영역 검증
 */
test.describe('Tier 6: Ops Governance', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });
    
    test('Login Policy Management (Access Controls)', async ({ adminPage }) => {
        const opsPage = new OpsGovernancePage(adminPage);

        await test.step('Admin: Navigate to Login Policy Hub', async () => {
            await opsPage.gotoLoginPolicy();
        });

        await test.step('Admin: Verify Policies Tab Accessibility', async () => {
            await opsPage.verifyPolicyTab();
        });
        // [E2E 감사 A1] 삭제됨: 'Simulate IP Restriction' 스텝은 page.route로 403을 스스로 주입한 뒤
        // 그 403을 그대로 단언하는 자기충족(self-fulfilling) 목이라 어떤 회귀도 잡지 못했음.
        // 실제 IP 정책 강제는 백엔드 통합/전용 테스트에서 서버 기동 후 검증한다.
    });

    test('Menu ACL & Role Mapping Synchronization', async ({ adminPage }) => {
        const opsPage = new OpsGovernancePage(adminPage);

        await test.step('Admin: Navigate to Menu By Authority', async () => {
            await opsPage.gotoMenuByAuthority();
        });

        await test.step('Admin: Verify Role-based Menu Tree Generation', async () => {
            // Selecting an existing role like SYSTEM_ADMIN or general Admin
            await opsPage.verifyMenuRoleMapping('관리자');
        });
    });

    // [E2E 감사 A1] 삭제됨: 'File Storage Integrity & Upload Validation'.
    // 실제 업로드(setInputFiles)는 주석 처리돼 있었고, 'Storage Full'은 page.route로 507을 스스로 주입한 뒤
    // 그 507을 단언하는 자기충족 목이었음 → 앱을 전혀 검증하지 않음. 실제 업로드/용량 초과 처리는
    // 전용 통합 테스트(서버 기동)에서 실 엔드포인트로 검증한다.
});
