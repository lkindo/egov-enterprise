import { test, expect } from '@playwright/test';

test('Addressbook Stable Check', async ({ page }) => {
    test.setTimeout(60000);

    // Bypass onboarding tour
    await page.addInitScript(() => { window.localStorage.setItem('egov_smart_tour_v1', 'true'); });

    // Go directly to address-book (skip legacy redirect overhead)
    await page.goto('/admin/collaboration/address-book', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/address-book/);

    // Wait for the search input
    const searchInput = page.getByPlaceholder(/이름, 부서, 회사명/i).first();
    await expect(searchInput).toBeVisible({ timeout: 30000 });
    await searchInput.fill('webmaster');
    await page.click('button:has-text("검색 실행")');

    // Verify page container is visible
    await expect(page.locator('main')).toBeVisible();
});
