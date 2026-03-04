import { test, expect } from '@playwright/test';

test.describe('Bulletin Board Module', () => {
    const bbsId = 'BBSMSTR_AAAAAAAAAAAA';

    test.beforeEach(async ({ page }) => {
        await page.goto(`/cop/bbs/selectBoardList?bbsId=${bbsId}`);
    });

    test('should display board list', async ({ page }) => {
        await expect(page.getByText('게시판')).toBeVisible();
        await expect(page.getByText('새 글 쓰기')).toBeVisible();
    });

    test('should view post detail', async ({ page }) => {
        // Assume there is at least one post in the list
        // Looking for a link in the table (usually the title)
        const firstRowTitle = page.locator('table tbody tr').first().locator('a').first();
        if (await firstRowTitle.count() > 0) {
            await firstRowTitle.click();
            await expect(page).toHaveURL(/.*selectBoardArticle.*/);
            await expect(page.getByText('게시판')).toBeVisible();
        } else {
            console.log('No posts found in the board list, skipping detail view check.');
        }
    });
});