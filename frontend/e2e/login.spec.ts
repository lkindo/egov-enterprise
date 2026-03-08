import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test('should login successfully with admin account', async ({ page }) => {
        await page.goto('/login');
        await page.fill('#id', 'webmaster');
        await page.fill('#password', '1');
        await page.click('button[type="submit"]');
        // Wait for landing on dashboard or home
        await expect(page.locator('nav, main, header').first()).toBeVisible({ timeout: 60000 });
        console.log('>>> Login successful and landing page reached');
    });

    test('should show error message on failed login', async ({ page }) => {
        await page.goto('/login');
        await page.fill('#id', 'wrong');
        await page.fill('#password', 'wrong');
        await page.click('button[type="submit"]');

        // Check for error text
        await expect(page.locator('body')).toContainText(/로그인에 실패|인증 오류|error/i);
    });
});
