import { test, expect } from '@playwright/test';

test.describe('Survey Module - Resilient Check', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => { window.localStorage.setItem('egov_smart_tour_v1', 'true'); });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
    });

    test('should display survey list or empty message', async ({ page }) => {
        await page.goto('/survey/response', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main')).toBeVisible();

        const html = await page.content();
        if (html.includes('설문조사명')) {
            await expect(page.locator('table')).toBeVisible();
        } else {
            await expect(page.locator('main')).toContainText(/데이터가 없습니다|설문조사/i);
        }
    });
});
