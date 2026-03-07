import { test, expect } from '@playwright/test';

test.describe('Dashboard Features', () => {
    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('/login');
        await page.fill('#id', 'webmaster');
        await page.fill('#password', '1');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/');
    });

    test('should display main dashboard widgets', async ({ page }) => {
        // Check for summary cards
        await expect(page.getByText('잔여 연차')).toBeVisible();
        await expect(page.getByText('내 업무 현황')).toBeVisible();

        // Check for charts - Using regex for flexibility
        await expect(page.getByText(/Traffic Analytics|System Pulse/).first()).toBeVisible();
    });

    test('should verify quick links', async ({ page }) => {
        // Look for Recent Notices link
        const noticeLink = page.getByRole('link', { name: /Recent Notices|더보기/i }).first();
        await expect(noticeLink).toBeVisible();
        await noticeLink.click();

        // Should navigate to notice board
        await page.waitForURL('**/cop/bbs');
    });

    test('should handle logout', async ({ page }) => {
        // Find and click user profile popover trigger (contains admin name '관리자' or 'webmaster')
        const profileBtn = page.locator('button:has-text("관리자"), button:has-text("webmaster")').first();
        await expect(profileBtn).toBeVisible();
        await profileBtn.click();

        // Click logout button inside the popover
        // The Header component uses a Button with "로그아웃" text
        const actualLogout = page.locator('[role="dialog"] button:has-text("로그아웃"), .PopoverContent button:has-text("로그아웃")').first();
        await expect(actualLogout).toBeVisible({ timeout: 10000 });
        await actualLogout.click();

        await page.waitForURL('**/login', { timeout: 15000 });
        await expect(page.getByText('E-GOV ENTERPRISE')).toBeVisible();
    });
});
