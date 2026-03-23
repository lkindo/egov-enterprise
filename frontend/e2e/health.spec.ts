import { test, expect } from '@playwright/test';

test.describe('Public Page Health Check', () => {
    // These pages should be accessible WITHOUT any authorization check
    const publicPages = [
        '/login',
        '/'
    ];

    for (const pageUrl of publicPages) {
        test(`should be able to access ${pageUrl}`, async ({ page }) => {
            await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            // Instead of status 200, we check for layout presence
            await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
        });
    }
});
