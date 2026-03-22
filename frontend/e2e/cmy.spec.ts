import { test, expect } from '@playwright/test';

test.describe('Community Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => { window.localStorage.setItem('egov_smart_tour_v1', 'true'); });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
    });

    test('should display community list', async ({ page }) => {
        await page.goto('/cop/cmy');
        await expect(page.locator('main')).toBeVisible();
    });
});
