import { expect,test } from '../fixtures/browser-test';
test.describe('공개 포털', () => {
    test.describe('Public Engagement & Experience', () => {
        test("일반 사용자 설문 목록과 개인 결재함 제목을 표시한다", async ({ userPage }) => {
            await test.step('User: Access Public Survey List', async () => {
                console.log('>>> [User] Navigating to Public Survey portal');
                await userPage.goto('/survey');
                await expect(userPage.locator('h1, h2, h3, .title').filter({ hasText: /설문.*조사|Poll/i }).first()).toBeVisible({ timeout: 15000 });
            });
            await test.step('User: Access Personal Approval Inbox', async () => {
                console.log('>>> [User] Navigating to Personal Approvals');
                await userPage.goto('/approvals');
                await expect(userPage.locator('h1, h2, h3, .title').filter({ hasText: /Approval Hub|결재.*|My Approvals/i }).first()).toBeVisible({ timeout: 15000 });
            });
        });
    });
});
test.describe('레거시 진입 경로', () => {
    /**
     * Business Extensions
     * 특화 비즈니스 모듈(약식결재, 간부일정, 도움말콘텐츠)에 대한 정밀 검증
     */
    test.describe('Business Extensions & Identity Governance', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });
        // [2026-09-06 DEC-OPS-040] /admin/system/ism 은 /approvals 로 통합됐다(DEC-OPS-039 제안의 owner 승인).
        //   결재 완주(상신→대기함→승인→처리함)는 11-enterprise-workflow 가 검증하므로 여기서는 별칭이 정본
        //   결재 허브에 도달하는지만 본다.
        test('ISM alias redirects to the approval hub', async ({ businessPage }) => {
            await businessPage.gotoIsm();
        });
    });
});
