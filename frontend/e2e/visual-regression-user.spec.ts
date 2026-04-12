import { test, expect } from './fixtures/base-test';

/**
 * 🎨 VISUAL REGRESSION TEST: User Management Dashboard
 * 주요 페이지의 시각적 무결성을 검증하여 CSS 깨짐이나 레이아웃 오류를 방지합니다.
 */

test.describe('Visual Regression - Admin Dashboards', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('User Management Hub Layout Check', async ({ page }) => {
        console.log('>>> Navigating to User Management Hub');
        await page.goto('/admin/user/manage', { waitUntil: 'networkidle' });

        // Wait for charts or dynamic data to settle
        await page.waitForTimeout(2000); 

        // 1. Full Page Screenshot
        await expect(page).toHaveScreenshot('user-manage-hub-full.png', {
            mask: [page.locator('.text-muted-foreground/40')], // Mask dynamic timestamp/IDs
            fullPage: true
        });

        // 2. Specific Component Check (Metric Group)
        const metrics = page.locator('.hub-metric-grid');
        if (await metrics.isVisible()) {
            await expect(metrics).toHaveScreenshot('user-manage-metrics.png');
        }

        console.log('>>> Visual Snapshot validated');
    });
});
