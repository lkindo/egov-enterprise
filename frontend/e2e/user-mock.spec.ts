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
    // 1. Intercept Modern User List API (Admin System path)
    await page.route('**/api/v1/admin/system/users*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            list: [
              { userId: 'test_admin_01', userNm: '모킹 관리자', email: 'admin@mock.com', userSttusCode: 'A' },
              { userId: 'test_user_01', userNm: '모킹 일반사용자', email: 'user@mock.com', userSttusCode: 'P' }
            ],
            totalElements: 2,
            totalPages: 1,
            size: 10,
            number: 0
          }
        }),
      });
    });

    // 2. Navigate to User Management HUB
    await page.goto('/admin/user/manage');

    // 3. Verify UI displays Modern HUB headers
    await expect(page.getByText('Identity Fabric HUB')).toBeVisible();
    await expect(page.getByText('전사 인적 자원 매트릭스')).toBeVisible();

    // 4. Verify UI displays mock data
    await expect(page.getByText('모킹 관리자')).toBeVisible();
    await expect(page.getByText('모킹 일반사용자')).toBeVisible();
  });

  test('User Search should handle empty results gracefully (Mocking)', async ({ page }) => {
    // Intercept Empty Search
    await page.route('**/api/v1/admin/system/users?*searchKeyword=NONEXISTENT*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          success: true,
          data: { list: [], totalElements: 0, totalPages: 0, size: 10, number: 0 } 
        }),
      });
    });

    await page.goto('/admin/user/manage');
    const searchInput = page.getByPlaceholder(/Probing for identity|검색/);
    await searchInput.fill('NONEXISTENT');
    await page.keyboard.press('Enter');

    // Verify 'No data' message or empty state in HUB
    await expect(page.getByText(/조회된 사용자 데이터가 데이터베이스 스트림에 존재하지 않습니다|Idle_Probe_State/i)).toBeVisible();
  });
});
