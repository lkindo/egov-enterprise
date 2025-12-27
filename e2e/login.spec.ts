import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test('should login successfully with admin account', async ({ page }) => {
        // Go to login page
        await page.goto('/uat/uia/egovLoginUsr.do');

        // Fill login form
        await page.fill('#id', 'admin');
        await page.fill('#password', 'admin123'); // Updated password

        // Click login button
        await page.click('.btn_login');

        // Wait for navigation and verify URL
        await page.waitForURL(/.*mainPage.do/, { timeout: 10000 });
        await expect(page).toHaveURL(/.*mainPage.do/);

        // Check if logout button is visible
        await expect(page.getByRole('link', { name: '로그아웃' })).toBeVisible();
    });

    test('should show error message on failed login', async ({ page }) => {
        await page.goto('/uat/uia/egovLoginUsr.do');

        await page.fill('#id', 'wronguser');
        await page.fill('#password', 'wrongpass');

        // Handle dialog
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('로그인에 실패하였습니다');
            await dialog.dismiss();
        });

        await page.click('.btn_login');
    });
});
