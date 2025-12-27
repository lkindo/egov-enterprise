import { test, expect } from '@playwright/test';

test.describe('Board Management', () => {
    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('/uat/uia/egovLoginUsr.do');
        await page.fill('#id', 'admin');
        await page.fill('#password', 'admin123');
        await page.click('.btn_login');

        // Wait for login success
        await page.waitForURL(/.*mainPage.do/, { timeout: 15000 });
        console.log('Login successful, current URL:', page.url());
    });

    test('should view notice board list', async ({ page }) => {
        // Go to notice board
        await page.goto('/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_AAAAAAAAAAAA');
        console.log('Navigated to board, current URL:', page.url());

        // Debug: log all h2 text
        const h2Texts = await page.locator('h2').allInnerTexts();
        console.log('H2 texts found:', h2Texts);

        // The title might be inside .tit_2 or just a heading
        // Based on EgovNoticeList.jsp line 218: <h2 class="tit_2">
        const titleLocator = page.locator('h2.tit_2');
        await expect(titleLocator).toBeVisible({ timeout: 10000 });

        const titleText = await titleLocator.innerText();
        console.log('Title text:', titleText);

        expect(titleText).toContain('공지사항');

        // Check if table contains rows
        const rows = page.locator('.board_list table tbody tr');
        const count = await rows.count();
        console.log('Board row count:', count);
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should view notice board detail', async ({ page }) => {
        // Go to notice board
        await page.goto('/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_AAAAAAAAAAAA');

        // Click on the first row title
        // Based on EgovNoticeList.jsp, title link is usually in a td
        const firstRowTitle = page.locator('.board_list table tbody tr').first().locator('td').nth(1).locator('a');
        await firstRowTitle.click();

        // Wait for detail page
        await expect(page.locator('h2.tit_2')).toBeVisible({ timeout: 10000 });
        const titleText = await page.locator('h2.tit_2').innerText();
        expect(titleText).toContain('공지사항');

        // Check if content table exists
        const wTable = page.locator('.w_table');
        await expect(wTable).toBeVisible();
    });
});
