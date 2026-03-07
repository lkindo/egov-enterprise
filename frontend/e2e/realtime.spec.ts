import { test, expect } from '@playwright/test';

test.describe('Real-Time Dashboard Features', () => {
    test.beforeEach(async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('#id', 'webmaster');
        await page.fill('#password', '1');
        await page.click('button[type="submit"]');
        await page.waitForURL('/');
    });

    test('should verify real-time connection status', async ({ page }) => {
        // The indicator should eventually show "실시간 연결됨"
        const indicator = page.getByText(/실시간 연결됨|연결 끊김/);
        await expect(indicator).toBeVisible();

        // Wait for connection (indicator becomes green/pulse in the UI)
        // We check the text specifically
        await expect(page.getByText('실시간 연결됨')).toBeVisible({ timeout: 15000 });
    });

    test('should toggle real-time notification dropdown', async ({ page }) => {
        // Look for the notification bell button within the RealTimeDashboard area
        const bellBtn = page.getByTestId('notif-bell');
        await expect(bellBtn).toBeVisible();

        await bellBtn.click();

        // Check if the notification card appears
        await expect(page.getByText('실시간 알림')).toBeVisible();
    });

    test('should display live stats cards', async ({ page }) => {
        // Verify presence of live stats titles
        await expect(page.getByText('실시간 접속자')).toBeVisible();
        await expect(page.getByText('분당 방문')).toBeVisible();
        await expect(page.getByText('신규 게시글')).toBeVisible();
    });
});
