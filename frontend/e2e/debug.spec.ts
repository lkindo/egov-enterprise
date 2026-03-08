import { test, expect } from '@playwright/test';

test('Snapshot Debug', async ({ page }) => {
    await page.addInitScript(() => { window.localStorage.setItem('egov_smart_tour_v1', 'true'); });
    await page.goto('/admin/system/common-code', { waitUntil: 'networkidle' });

    // Screenshot to see what's actually rendered
    await page.screenshot({ path: 'playwright-screenshots/admin-code-debug.png', fullPage: true });

    // Check for "코드 등록" presence in DOM regardless of visibility
    const html = await page.content();
    console.log('>>> Is "코드 등록" in HTML?', html.includes('코드 등록'));
    console.log('>>> Current URL:', page.url());
});
