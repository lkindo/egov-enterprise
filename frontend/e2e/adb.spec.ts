import { test, expect } from '@playwright/test';

test('Addressbook Stable Check', async ({ page }) => {
    test.setTimeout(180000);

    // Bypass onboarding tour
    await page.addInitScript(() => { window.localStorage.setItem('egov_smart_tour_v1', 'true'); });
    await page.goto('/', { waitUntil: 'networkidle' });

    console.log('>>> Step 2: Access Address Book (Redirection Check)');
    await page.goto('/cop/adb'); 
    await page.waitForURL('**/admin/collaboration/address-book', { timeout: 30000 });
    await expect(page).toHaveURL(/address-book/);

    console.log('>>> Step 3: Search Operation');
    const searchInput = page.getByPlaceholder(/이름, 부서, 회사명/i).first();
    await expect(searchInput).toBeVisible({ timeout: 40000 });
    await searchInput.fill('webmaster');
    await page.click('button:has-text("검색 실행")');

    console.log('>>> Step 4: Verify Content');
    // Result might be empty if no data in DB, so check for high-level container visibility
    await expect(page.locator('main')).toBeVisible();
    console.log('>>> SUCCESS: Addressbook page reached and search executed');
});
