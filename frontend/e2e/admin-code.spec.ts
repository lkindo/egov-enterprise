import { test, expect } from '@playwright/test';

test.describe('Admin Common Code Management', () => {
    test.beforeEach(async ({ page }) => {
        // Login as Admin
        await page.goto('/login');
        await page.fill('input[name="id"]', 'webmaster');
        await page.fill('input[name="password"]', '1');
        await page.click('button[type="submit"]');
        
        // Wait for redirect to main/dashboard
        await page.waitForURL('/');
    });

    test('should display common code list in admin panel', async ({ page }) => {
        // Navigate to Common Code Management
        await page.goto('/admin/system/common-code');

        // Verify page header
        await expect(page.getByRole('heading', { name: '공통코드 관리' })).toBeVisible();

        // Check if table exists and has data (Wait for API response)
        const table = page.locator('table');
        await expect(table).toBeVisible();
        
        // At least one row should be present in a standard eGov installation
        const rows = table.locator('tbody tr');
        await expect(rows.first()).toBeVisible();
    });

    test('should search common codes', async ({ page }) => {
        await page.goto('/admin/system/common-code');

        // Search by Code Name (Assuming '공통' is a common keyword)
        const searchInput = page.locator('input[placeholder*="검색어"]');
        await searchInput.fill('공통');
        await page.keyboard.press('Enter');

        // Verify results
        const rows = page.locator('table tbody tr');
        await expect(rows.first()).toContainText('공통');
    });
});
