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
        await expect(page.getByText('진행 업무')).toBeVisible();

        // Check for charts
        await expect(page.getByText('주간 업무 처리 현황')).toBeVisible();
    });

    test('should verify quick links', async ({ page }) => {
        // Click on notice link in quick menu
        const noticeLink = page.getByRole('link', { name: '공지사항' });
        await expect(noticeLink).toBeVisible();
        await noticeLink.click();

        // Should navigate to notice board
        await page.waitForURL('**/cop/bbs');
        await expect(page.getByText('게시판')).toBeVisible();
    });

    test('should handle logout', async ({ page }) => {
        // Click logout in header
        // Header uses user-nav component or similar.
        // Let's look for logout button/link
        const logoutBtn = page.getByRole('button', { name: /로그아웃|webmaster/i });
        await logoutBtn.click();

        // If it's a dropdown, we might need to click logout inside it
        const actualLogout = page.getByText('로그아웃');
        if (await actualLogout.isVisible()) {
            await actualLogout.click();
        }

        await page.waitForURL('**/login');
        await expect(page.getByText('E-GOV ENTERPRISE')).toBeVisible();
    });
});
