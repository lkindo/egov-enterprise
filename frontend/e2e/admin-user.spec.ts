import { test, expect } from '@playwright/test';

test.describe('Admin User Management', () => {
    test.beforeEach(async ({ page }) => {
        // Bypass onboarding tour
        await page.addInitScript(() => {
            window.localStorage.setItem('egov_smart_tour_v1', 'true');
        });

        // Ensure we explicitly load the homepage to allow React Context (useAuth) to hydrate from cookies
        await page.goto('/', { waitUntil: 'networkidle' });
    });

    test('should display user list in admin panel', async ({ page }) => {
        // Navigate to User Management
        await page.goto('/admin/user/manage');

        // Verify page header
        await expect(page.getByText('기업 조직 허브')).toBeVisible();

        // Check if user list exists (using a more generic selector for the Cards)
        await expect(page.getByText(/ID 저장소|사용자/).first()).toBeVisible();

        // At least some user should be present
        const userItem = page.getByText(/webmaster|관리자/i);
        await expect(userItem.first()).toBeVisible();
    });

    test('should search users by name', async ({ page }) => {
        await page.goto('/admin/user/manage');

        // Fill search input
        const searchInput = page.getByPlaceholder(/목록 검색.../);
        await expect(searchInput).toBeVisible();
        await searchInput.fill('관리자');

        // Verify results - looking for the text in the list
        await expect(page.getByText('관리자').first()).toBeVisible({ timeout: 15000 });
    });
});
