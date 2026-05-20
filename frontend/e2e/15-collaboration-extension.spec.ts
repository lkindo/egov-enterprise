import { test, expect } from './fixtures/base-test';
import { ScrapPage } from './pages/ScrapPage';
import { KnowledgePage } from './pages/KnowledgePage';

test.describe('Tier 15: Collaboration & Knowledge Extension', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    let scrapPage: ScrapPage;
    let knowledgePage: KnowledgePage;

    test.beforeEach(async ({ page }) => {
        scrapPage = new ScrapPage(page);
        knowledgePage = new KnowledgePage(page);
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

    test('should manage Knowledge (FAQ/Q&A) Support entries', async ({ page }) => {
        // Navigating to FAQ board (BBSMSTR_AAAAAAAAAAAA is standard for FAQ)
        await knowledgePage.gotoFAQ();
        
        const question = `Q: E2E Question ${Date.now()}`;
        const answer = 'A: This is an automated answer generated for system support validation.';
        
        // Create a new knowledge node
        await knowledgePage.createFAQ(question, answer);
        
        // Navigate back to the FAQ board list explicitly to perform search
        await page.goto('/admin/community/boards?bbsId=BBSMSTR_AAAAAAAAAAAA');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);
        
        // Search and verify
        await knowledgePage.searchFAQ(question);
        await expect(page.getByText(question).first()).toBeVisible({ timeout: 15000 });
    });
});
