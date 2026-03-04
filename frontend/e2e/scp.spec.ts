import { test, expect } from '@playwright/test';

test.describe('Scrap Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/cop/scp/selectScrapList');
    });

    test('should display scrap list', async ({ page }) => {
        await expect(page.getByText('스크랩 관리')).toBeVisible();
    });

    test('should navigate to registration page', async ({ page }) => {
        await page.getByRole('button', { name: '스크랩 등록' }).click();
        await expect(page).toHaveURL(/\/cop\/scp\/insertScrap\/?/);
        await expect(page.getByText('새 스크랩 등록')).toBeVisible();
    });
});
