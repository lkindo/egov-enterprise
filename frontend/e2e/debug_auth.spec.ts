import { test, expect } from '@playwright/test';

test('check auth state', async ({ page }) => {
    await page.goto('/');
    const ls = await page.evaluate(() => JSON.stringify(window.localStorage));
    console.log('>>> LOCAL STORAGE:', ls);
    const cookies = await page.context().cookies();
    console.log('>>> COOKIES:', JSON.stringify(cookies));
    await page.screenshot({ path: 'check_auth.png' });
});
