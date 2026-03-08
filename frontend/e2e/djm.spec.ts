import { test, expect } from '@playwright/test';

test.describe('DeptJob Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => { window.localStorage.setItem('egov_smart_tour_v1', 'true'); });
        await page.goto('/', { waitUntil: 'networkidle' });
    });

    test('should display dept job list', async ({ page }) => {
        await page.goto('/cop/djm');
        await expect(page.locator('main')).toBeVisible();
    });
});
