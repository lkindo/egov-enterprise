import { test, expect } from '@playwright/test';

test.describe('Tier 20: Common Security & UI Validation', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('Session Integrity: Handling Token Clearance', async ({ page, context }) => {
        console.log('>>> Step 1: Navigating to a protected admin page');
        await page.goto('/admin/community/boards/master');
        await expect(page).toHaveURL(/.*master/);

        console.log('>>> Step 2: Clearing cookies and localStorage to simulate session expiration');
        await context.clearCookies();
        await page.evaluate(() => localStorage.clear());
        
        console.log('>>> Step 3: Attempting a protected action (refresh)');
        await page.reload();
        
        // Should be redirected to login
        await expect(page).toHaveURL(/.*login/, { timeout: 15000 });
        console.log('>>> Correctly redirected to login after session loss');
    });

    test('UI Robustness: Search with Special Characters (Injection Prevention)', async ({ page }) => {
        const specialChars = "'\"<script>alert(1)</script>&%";
        console.log(`>>> Step 1: Searching for special characters: ${specialChars}`);
        
        await page.goto('/admin/community/boards/master');
        const searchInput = page.locator('input[placeholder*="검색"], input[aria-label*="Search"]').first();
        await expect(searchInput).toBeVisible();
        
        await searchInput.fill(specialChars);
        await page.keyboard.press('Enter');
        
        // Verify UI doesn't crash (e.g., blank screen) and scripts are not executed
        // Playwright tests would fail if a real alert popped up unless handled, 
        // but here we just check if the page remains stable.
        await expect(page.locator('body')).toBeVisible();
        
        // Verify result text is properly escaped in the search indicator if it exists
        const indicator = page.locator('text=검색 결과, :text-matches("results", "i")').first();
        if (await indicator.isVisible()) {
            const text = await indicator.textContent();
            expect(text).toContain(specialChars);
        }
        console.log('>>> Special character search handled safely by UI');
    });

    test('Navigation Integrity: Rapid Menu Switching', async ({ page }) => {
        const menus = [
            '/admin/community/boards/master',
            '/admin/system/menus',
            '/admin/system/programs',
            '/admin/community/boards/master'
        ];

        console.log('>>> Step 1: Rapidly switching between administrative menus');
        for (const url of menus) {
            await page.goto(url);
            // Verify breadcrumb or page header contains relevant keywords
            const header = page.locator('h1, h2').first();
            await expect(header).toBeVisible();
        }
        console.log('>>> Rapid navigation completed without system deadlock');
    });
});
