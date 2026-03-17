import { test, expect } from '@playwright/test';

test.describe('Network Error Resilience', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => { window.localStorage.setItem('egov_smart_tour_v1', 'true'); });
    });

    test('should show error toast when any API fails with 500', async ({ page }) => {
        // 모든 /api/v1 하위 요청에 대해 500 에러 발생
        await page.route('**/api/v1/**', async route => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ success: false, message: 'Server Exploded' }),
            });
        });

        // 데이터 로딩이 발생하는 페이지로 이동
        await page.goto('/admin/stats');

        // UI 에러 피드백 확인 (Toast 메시지 등)
        const errorFeedback = page.locator('text=/오류|실패|failed|Error|Exploded/i');
        await expect(errorFeedback.first()).toBeVisible({ timeout: 15000 });
        
        console.log('>>> SUCCESS: UI handled broad API 500 error.');
    });

    test('should show loading state during delayed API (Mock)', async ({ page }) => {
        // API 지연 시뮬레이션
        await page.route('**/api/v1/**', async route => {
            await new Promise(resolve => setTimeout(resolve, 3000));
            await route.continue();
        });

        await page.goto('/admin/stats');

        // 로딩 상태(Skeleton/Spinner) 확인 - 문법 수정
        const loader = page.locator('.animate-pulse, .animate-spin');
        const loadingText = page.getByText('불러오고 있습니다');
        await expect(loader.or(loadingText).first()).toBeVisible();
        console.log('>>> SUCCESS: Loading indicator verified.');
    });
});
