import { test, expect } from '@playwright/test';

test.describe('Admin User Management', () => {
    test.beforeEach(async ({ page }) => {
        // Login as Admin
        await page.goto('/login');
        await page.fill('input[name="id"]', 'webmaster');
        await page.fill('input[name="password"]', '1');
        await page.click('button[type="submit"]');
        await page.waitForURL('/');
    });

    test('should display user list in admin panel', async ({ page }) => {
        // Navigate to User Management
        await page.goto('/admin/user');

        // Verify page header
        await expect(page.getByRole('heading', { name: '사용자 관리' })).toBeVisible();

        // Check if table exists
        const table = page.locator('table');
        await expect(table).toBeVisible();
        
        // At least the admin user should be present
        const rows = table.locator('tbody tr');
        await expect(rows.first()).toBeVisible();
        await expect(rows).toContainText('webmaster');
    });

    test('should search users by name', async ({ page }) => {
        await page.goto('/admin/user');

        // Fill search input (Assuming '관리자' is the name of webmaster)
        const searchInput = page.locator('input[placeholder*="검색어"]');
        await searchInput.fill('관리자');
        await page.keyboard.press('Enter');

        // Verify results
        const rows = page.locator('table tbody tr');
        await expect(rows.first()).toContainText('관리자');
    });
});
