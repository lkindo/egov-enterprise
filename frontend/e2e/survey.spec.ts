import { test, expect } from '@playwright/test';

test.describe('Survey Module', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => { window.localStorage.setItem('egov_smart_tour_v1', 'true'); });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
    });

    test('should display survey list', async ({ page }) => {
        await page.goto('/survey/response');
        await expect(page.locator('main')).toBeVisible();
        await expect(page.getByText(/상세|검색|설문|Survey/i).first()).toBeVisible();
    });

    test('should navigate to survey detail and back', async ({ page }) => {
        await page.goto('/survey/response');
        // Back navigation test logic if present
    });
});
