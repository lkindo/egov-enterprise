import { test } from '../fixtures/browser-test';
import { OpsGovernancePage } from '../pages/OpsGovernancePage';
/**
 * Ops Governance
 * 시스템의 보안과 운영 효율성을 극대화하는 영역 검증
 */
test.describe('Ops Governance', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });
    test("조직 정책 별칭이 정본 화면으로 이동하고 조직 정책 탭이 선택된다", async ({ adminPage }) => {
        const opsPage = new OpsGovernancePage(adminPage);
        await test.step('Admin: Navigate to Login Policy Hub', async () => {
            await opsPage.gotoLoginPolicy();
        });
        await test.step('Admin: Verify Policies Tab Accessibility', async () => {
            await opsPage.verifyPolicyTab();
        });
    });
});
