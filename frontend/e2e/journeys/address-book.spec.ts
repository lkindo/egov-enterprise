import { expect,test } from '../fixtures/browser-test';
/**
 * Advanced Collaboration & Intelligence
 * 실제 UI 상호작용을 통한 협업 도구 및 지능형 분석 기능 검증
 */
test.describe('Advanced Collaboration & Intelligence', () => {
    test.use({
        storageState: 'playwright/.auth/admin.json',
        viewport: { width: 1920, height: 1080 }
    });
    test("협업 허브에서 주소록 등록 dialog를 열고 등록한 연락처를 검색한다", async ({ collabPage, page }) => {
        console.log('\n>>> Starting Collaboration: Register Identity Flow');
        const suffix = Math.random().toString(36).substring(7);
        const testName = `Identity_${suffix}`;
        const testEmail = `${testName}@egov.enterprise.com`;
        await collabPage.goto();
        await collabPage.createContact(testName, testEmail);
        console.log('>>> Identity registered. Verifying visibility in Address Book.');
        // 주소록은 collaboration 허브의 탭이 아니라 demo pack 전용 목록 라우트에서 관리한다.
        await expect(page).toHaveURL(/\/admin\/collaboration\/address-book\/select-address-book-list/);
        await collabPage.verifyIdentityInList(testName);
    });
});
