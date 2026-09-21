import { expect,test } from '../fixtures/browser-test';
import { CommunityPage } from '../pages/CommunityPage';
test.describe('Board & Community (Business Flow)', () => {
    // [2026-08-10 제거] `test.describe.configure({ mode: 'parallel' })`.
    //   playwright.config 는 `workers: 1` 이라(공유 DB 오염·OOM 방지) 이 선언은 **아무 효과가 없었다**.
    //   그럼에도 "병렬 실행 최적화" 라는 주석이 붙어 있어, 아래 테스트들이 워커 격리를 전제로
    //   쓰여 있다는 잘못된 인상을 준다(실제로 `TEST_WORKER_INDEX` 를 이름에 섞는 코드가 그 인상 위에 있다).
    //   워커를 늘리려면 config 의 `workers` 를 바꾸고 **공유 DB 상태를 쓰는 스펙부터 격리**해야 한다 —
    //   그 판단 없이 이 한 줄만 두면 "병렬로 돌고 있다"는 착각만 남는다.
    test.use({ storageState: 'playwright/.auth/admin.json' });
    test('Community of Practice (COP) Matrix Verification', async ({ page }) => {
        const communityPage = new CommunityPage(page);
        await communityPage.goto();
        await communityPage.selectCategory('COMMUNITY');
        await communityPage.verifyCOPList();
        await communityPage.gotoMaster();
    });
    test.describe('Community Supplementary Services Smoke Check', () => {
        // [E2E 감사 Phase0] 동일 URL(/admin/collaboration) 3중 중복 스모크(Community Hub/Smart Scrap/
        // Corporate Addressbook)를 1개로 축약. 실제 협업 거동은 08(collab)·13(mail)이 검증한다.
        // 'Online Polls'(/admin/survey/manage)는 05-public-experience의 설문 생명주기가 소유하므로 제외.
        const services = [
            { name: 'Collaboration Hub', url: '/admin/collaboration' },
            { name: 'Electronic Approvals', url: '/admin/sanctn/workflow' }
        ];
        for (const service of services) {
            test(`Service Availability: ${service.name}`, async ({ page }) => {
                await page.goto(service.url, { waitUntil: 'domcontentloaded' });
                await expect(page.locator('main, .main-content, #content').first()).toBeVisible();
            });
        }
    });
});
