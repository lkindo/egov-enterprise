import { test, expect } from '@playwright/test';

test.describe('Admin User Management', () => {
    test.beforeEach(async ({ page }) => {
        // Bypass onboarding tour
        await page.addInitScript(() => {
            window.localStorage.setItem('egov_smart_tour_v1', 'true');
        });

        // Login as Admin
        await page.goto('/login');
        await page.fill('#id', 'webmaster');
        await page.fill('#password', '1');
        await page.click('button[type="submit"]');
        await page.waitForURL('/');
    });

    test('should display user list in admin panel', async ({ page }) => {
        // Navigate to User Management
        await page.goto('/admin/user/manage');

        // Verify page header
        await expect(page.getByText('사용자 계정 관리')).toBeVisible();

        // Check if table exists
        const table = page.locator('table');
        await expect(table).toBeVisible();

        // At least the admin user should be present
        const adminRow = table.locator('tbody tr').filter({ hasText: 'webmaster' });
        await expect(adminRow.first()).toBeVisible();
    });

    test('should search users by name', async ({ page }) => {
        await page.goto('/admin/user/manage');

        // Fill search input
        const searchInput = page.getByPlaceholder(/아이디 또는 이름 입력/);
        await expect(searchInput).toBeVisible();
        await searchInput.fill('관리자');

        // Click search and wait for navigation/reload
        await page.click('button:has-text("검색 실행")');

        // Wait for the URL to change and include the encoded or decoded keyword
        await page.waitForURL(url => url.searchParams.get('searchKeyword') === '관리자', { timeout: 15000 });

        // Verify results - looking for the text in the table
        const table = page.locator('table');
        await expect(table).toContainText('관리자');
    });
});
