import { test, expect } from '@playwright/test';

test.describe('Dashboard Features', () => {
    test.beforeEach(async ({ page }) => {
        // Bypass onboarding tour
        await page.addInitScript(() => {
            window.localStorage.setItem('egov_smart_tour_v1', 'true');
        });
        await page.goto('/', { waitUntil: 'networkidle' });
    });

    test('should display main dashboard widgets', async ({ page }) => {
        // Check for summary cards
        await expect(page.getByText('내 업무 현황')).toBeVisible();
        await expect(page.getByText('결재 대기')).toBeVisible();
        await expect(page.getByText('보안 지수')).toBeVisible();

        // Check for charts - Using regex for flexibility
        await expect(page.getByText(/Traffic Analytics|System Pulse/).first()).toBeVisible({ timeout: 20000 });
    });

    test('should verify quick links', async ({ page }) => {
        // Look for Recent Notices link
        const noticeLink = page.getByRole('link', { name: /Recent Notices|더보기/i }).first();
        await expect(noticeLink).toBeVisible();
        await noticeLink.click();

        // Should navigate to notice board
        await expect(page).toHaveURL(/.*\/admin\/community\/boards/);
    });

    test('should handle logout', async ({ page }) => {
        // Find and click user profile popover trigger
        const profileBtn = page.getByRole('button', { name: /관리자|webmaster/i }).first();
        await expect(profileBtn).toBeVisible({ timeout: 15000 });
        await profileBtn.click();

        // Click logout button - look for "로그아웃" or "Sign Out"
        const logoutBtn = page.getByRole('button', { name: /로그아웃|Sign Out/i }).last();
        await expect(logoutBtn).toBeVisible({ timeout: 5000 });
        await logoutBtn.click();

        // Verify redirection to login
        await page.waitForURL('**/login', { timeout: 15000 });
        await expect(page.locator('body')).toContainText(/LOG(IN| OUT)|E-GOV|표준프레임워크|아이디/i);
    });
});
