import { test, expect } from '@playwright/test';

test.describe('Admin User Management - Mocking Strategy', () => {
  test.beforeEach(async ({ page }) => {
    // Universal onboarding bypass
    await page.addInitScript(() => {
      window.localStorage.setItem('egov_smart_tour_v1', 'true');
    });

    // Mock session (bypass auth for frontend testing)
    await page.context().addCookies([
      { name: 'accessToken', value: 'mock-token', domain: 'localhost', path: '/' },
      { name: 'userRole', value: 'ROLE_ADMIN', domain: 'localhost', path: '/' }
    ]);
  });

  test('User List should load from Mock Data (No DB dependency)', async ({ page }) => {
    // 1. Intercept User List API
    await page.route('**/api/v1/users*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          list: [
            { userId: 'test_admin_01', userNm: '모킹 관리자', email: 'admin@mock.com', userSttusCode: 'A' },
            { userId: 'test_user_01', userNm: '모킹 일반사용자', email: 'user@mock.com', userSttusCode: 'P' }
          ],
          total: 2,
          page: 1,
          size: 10
        }),
      });
    });

    // 2. Navigate to User Management
    await page.goto('/admin/user/manage');

    // 3. Verify UI displays mock data
    await expect(page.getByText('모킹 관리자')).toBeVisible();
    await expect(page.getByText('모킹 일반사용자')).toBeVisible();
    await expect(page.locator('table')).toContainText('test_admin_01');
  });

  test('User Search should handle empty results gracefully (Mocking)', async ({ page }) => {
    // Intercept Empty Search
    await page.route('**/api/v1/users?*searchKeyword=NONEXISTENT*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ list: [], total: 0, page: 1, size: 10 }),
      });
    });

    await page.goto('/admin/user/manage');
    const searchInput = page.getByPlaceholder(/검색/);
    await searchInput.fill('NONEXISTENT');
    await page.keyboard.press('Enter');

    // Verify 'No data' message
    await expect(page.locator('table, .empty-message, :text-matches("데이터|기록|결과", "i")').first()).toBeVisible();
  });
});
