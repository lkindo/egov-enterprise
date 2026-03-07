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
        await page.waitForURL('**/', { timeout: 30000 });

        // Check if welcome message is visible
        await expect(page.getByText(/Hi,|주요 인사이트/).first()).toBeVisible({ timeout: 15000 });
    });

    test('should show error message on failed login', async ({ page }) => {
        await page.goto('/login');

        await page.fill('#id', 'wronguser');
        await page.fill('#password', 'wrongpass');

        await page.click('button[type="submit"]');

        // Check for error message using test-id
        const errorMsg = page.getByTestId('login-error');
        await expect(errorMsg).toBeVisible({ timeout: 10000 });
        await expect(errorMsg).toContainText(/로그인|실패|확인|credentials|Unauthorized|failed|401/i);
    });
});
