import { test, expect } from './fixtures/base-test';

/**
 * ☣️ FAULT INJECTION TEST: Error Resiliency
 * 서버 장애나 네트워크 오류 상황에서 프론트엔드가 사용자에게 적절한 피드백을 주는지 검증합니다.
 */

test.describe('Fault Injection - Resilience Verification', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('should show error toast when User List API fails (500)', async ({ page }) => {
        console.log('>>> Injecting 500 Internal Server Error for User List');
        
        // API 요청 가로채서 500 에러 반환
        await page.route('**/api/v1/admin/system/users*', async route => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: false,
                    message: 'INTERNAL_SERVER_CRITICAL_FAILURE: Database connection lost'
                })
            });
        });

        await page.goto('/admin/user/manage');

        // Check for error feedback (Toast or Alert)
        const errorToast = page.getByRole('alert').filter({ hasText: /INTERNAL_SERVER_CRITICAL_FAILURE/i });
        await expect(errorToast).toBeVisible({ timeout: 15000 });
        
        console.log('>>> SUCCESS: Error feedback verified for 500 status');
    });

    test('should handle network timeout gracefully', async ({ page }) => {
        console.log('>>> Simulating Network Timeout (Aborted Request)');
        
        await page.route('**/api/v1/admin/system/users*', async route => {
            await route.abort('timedout');
        });

        await page.goto('/admin/user/manage');
        
        // hydration 이후 에러 메시지가 표시되어야 함
        const pageContent = await page.content();
        expect(pageContent).toContain('오류'); // 한국어 에러 메시지 포함 확인
        
        console.log('>>> SUCCESS: Timeout handling verified');
    });
});
