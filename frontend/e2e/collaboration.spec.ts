import { test, expect } from '@playwright/test';

test.describe('Collaboration Modules', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => { window.localStorage.setItem('egov_smart_tour_v1', 'true'); });
        await page.goto('/', { waitUntil: 'networkidle' });
    });

    const routes = [
        '/cop/adb',
        '/cop/bbs'
    ];

    test('should navigate through various modules', async ({ page }) => {
        for (const route of routes) {
            console.log(`>>> Testing route: ${route}`);
            await page.goto(route, { waitUntil: 'networkidle' });
            await expect(page.locator('main')).toBeVisible();
        }
    });

    test('should verify common layout elements', async ({ page }) => {
        await page.goto('/cop/adb');
        // Check for navigation sidebar/menu
        await expect(page.locator('nav, aside, .sidebar, [role="navigation"]').first()).toBeVisible();
        // Check for header
        await expect(page.locator('header').first()).toBeVisible();
    });
});
