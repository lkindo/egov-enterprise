import { test, expect } from '@playwright/test';

test('Addressbook Stable Check', async ({ page }) => {
    test.setTimeout(180000);

    console.log('>>> Step 1: Procedural Login');
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.fill('#id', 'webmaster');
    await page.fill('#password', '1');
    await page.click('button[type="submit"]', { force: true });

    await page.waitForURL(url => url.pathname === '/', { timeout: 60000 });
    await page.addInitScript(() => { window.localStorage.setItem('egov_smart_tour_v1', 'true'); });

    console.log('>>> Step 2: Access Address Book');
    await page.goto('/cop/adb', { waitUntil: 'networkidle' });

    console.log('>>> Step 3: Search Operation');
    const searchInput = page.getByPlaceholder(/검색어를 입력/i).first();
    await expect(searchInput).toBeVisible({ timeout: 20000 });
    await searchInput.fill('webmaster');
    await page.keyboard.press('Enter');

    console.log('>>> Step 4: Verify Results');
    // Expect some row to exist
    await page.waitForTimeout(3000);
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 20000 });

    console.log('>>> SUCCESS: Addressbook verified');
});
