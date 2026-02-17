import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test('should login successfully with admin account', async ({ page }) => {
        // Go to login page
        await page.goto('/login');

        // Fill login form
        await page.fill('#id', 'webmaster');
        await page.fill('#password', '1');

        // Click login button
        await page.click('button[type="submit"]');

        // Wait for navigation to dashboard (root)
        await page.waitForURL('**/', { timeout: 10000 });
        
        // Check if welcome message is visible
        await expect(page.getByText('안녕하세요')).toBeVisible();
    });

    test('should show error message on failed login', async ({ page }) => {
        await page.goto('/login');

        await page.fill('#id', 'wronguser');
        await page.fill('#password', 'wrongpass');

        await page.click('button[type="submit"]');

        // Check for error message in the UI
        await expect(page.getByText('로그인에 실패했습니다')).toBeVisible();
    });
});
