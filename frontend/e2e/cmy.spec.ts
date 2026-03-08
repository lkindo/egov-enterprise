import { test, expect } from '@playwright/test';

test.describe('Community Module', () => {
    test.setTimeout(120000);

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.setItem('egov_smart_tour_v1', 'true');
        });

        await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.fill('#id', 'webmaster');
        await page.fill('#password', '1');
        await page.click('button[type="submit"]');

        try {
            await page.waitForURL(url => url.pathname === '/', { timeout: 30000 });
        } catch (e) {
            await page.goto('/', { waitUntil: 'networkidle' });
        }

        await page.waitForTimeout(3000);
        await page.goto('/cop/cmy', { waitUntil: 'networkidle' });
    });

    test('should display community list', async ({ page }) => {
        const table = page.locator('table').first();
        await expect(table).toBeVisible({ timeout: 15000 });
    });
});
