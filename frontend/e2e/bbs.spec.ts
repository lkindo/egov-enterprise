import { test, expect } from '@playwright/test';

test.describe('BBS Module', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test('BBS List and Search', async ({ page }) => {
        const bbsId = 'BBSMSTR_AAAAAAAAAAAA'; // Default sample BBS ID
        await page.goto(`/admin/community/boards?bbsId=${bbsId}`, { waitUntil: 'networkidle' });

        console.log('>>> Step 2: BBS List');
        await expect(page.locator('main')).toBeVisible();
        // Wait for the table or the empty message
        await expect(page.locator('table, .bbs-list, [role="grid"], :text-matches("게시글이 존재하지 않습니다", "i")').first()).toBeVisible({ timeout: 30000 });

        // Search action
        const searchInput = page.locator('input[placeholder*="검색"], input[type="text"]').first();
        if (await searchInput.isVisible()) {
            await searchInput.fill('공지');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(2000);
            await expect(page.locator('table, .bbs-list, [role="grid"], :text-matches("데이터|게시글|목록", "i")').first()).toBeVisible({ timeout: 20000 });
        }
    });

    test('BBS Detail View', async ({ page }) => {
        const bbsId = 'BBSMSTR_AAAAAAAAAAAA';
        await page.goto(`/admin/community/boards?bbsId=${bbsId}`, { waitUntil: 'networkidle' });

        // StandardDataTable triggers row click, but the test looks for links
        const firstRow = page.locator('table tbody tr').first();
        if (await firstRow.isVisible()) {
            await firstRow.click();
            await expect(page.locator('main')).toBeVisible();
            await expect(page.getByText(/상세|내용|목록|Back/i).first()).toBeVisible();
        }
    });
});
