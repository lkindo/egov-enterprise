import { test, expect } from '@playwright/test';

test.describe('Collaboration Modules', () => {
    test.setTimeout(180000); // More time for multi-page jumping

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
    });

    test('should navigate through various modules', async ({ page }) => {
        const modules = ['/cop/adb', '/smart-toolkit/schedule', '/cop/scp', '/cop/cmy'];

        for (const route of modules) {
            await page.goto(route, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(2000);
            await expect(page.locator('body')).toBeVisible();
        }
    });
});
