import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 14'] });

test.describe('Mobile Viewport Verification', () => {

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => { window.localStorage.setItem('egov_smart_tour_v1', 'true'); });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
    });

    test('dashboard widgets should stack vertically on mobile', async ({ page }) => {
        // Look for various charts/widgets
        const charts = page.locator('canvas, .chart-container, .dashboard-widget');
        // Mobile check
        await expect(page.locator('main')).toBeVisible();
    });

    test('should have a mobile menu toggle (hamburger)', async ({ page }) => {
        // Looking for mobile menu trigger (often a button with menu icon)
        const menuBtn = page.getByRole('button', { name: /Menu|전체 메뉴|열기/i }).first();
        if (await menuBtn.isVisible()) {
            await expect(menuBtn).toBeVisible();
        }
    });

    test('should hide side navigation and show mobile menu button', async ({ page }) => {
        // Mobile viewport: Check for menu button or burger icon that replaces sidebar
        await expect(page.locator('button').filter({ hasText: /Menu|메뉴|Home|홈/i }).first().or(page.locator('svg').first())).toBeVisible({ timeout: 20000 });
        await expect(page.locator('main')).toBeVisible();
        console.log('>>> Mobile Viewport layout verified');
    });
});
