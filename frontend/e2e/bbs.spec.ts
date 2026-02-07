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

    test('should navigate to write page', async ({ page }) => {
        await page.getByRole('button', { name: '새 글 쓰기' }).click();
        await expect(page).toHaveURL(/\/cop\/bbs\/insertBoardArticle/);
        await expect(page.getByText('Create New Post')).toBeVisible();
    });
});
