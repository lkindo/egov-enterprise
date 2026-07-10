import { test, expect } from './fixtures/base-test';
import { ScrapPage } from './pages/ScrapPage';

test.describe('Tier 15: Collaboration & Knowledge Extension', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    let scrapPage: ScrapPage;

    test.beforeEach(async ({ page }) => {
        scrapPage = new ScrapPage(page);
    });

    test('should manage scraps in collaboration hub', async ({ page }) => {
        await scrapPage.goto();
        
        // Basic search and list check
        // await scrapPage.searchScrap('E2E');
        
        // Since scraps are created from BBS articles, we expect existing ones or a clean state
        // This test verifies the list integrity
        const listItems = page.locator('tr, .list-item, [data-testid="scrap-item"]');
        if (await listItems.count() > 0) {
            console.log(`[E2E] Found ${await listItems.count()} scraps in list`);
            await expect(listItems.first()).toBeVisible();
        } else {
            console.log('[E2E] No scraps found, verifying empty state UI');
            await expect(page.getByText(/데이터가 없습니다|결과가 없습니다/)).toBeVisible();
        }
    });

    // [E2E 감사 Phase3 중복제거] 삭제됨: 'should manage Knowledge (FAQ/Q&A)' — KnowledgePage.gotoFAQ/createFAQ로
    // 동일 board(BBSMSTR_AAAAAAAAAAAA)에 쓰는 FAQ 생성-검증 라운드트립을 05-public-experience가 소유(포털 노출까지 검증).
});
