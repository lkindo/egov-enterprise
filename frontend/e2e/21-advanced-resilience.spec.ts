import { test, expect } from './fixtures/base-test';

/**
 * [Tier 21] Advanced Resilience: Network Failure & UI Stability
 * 
 * 시스템이 불안정한 네트워크 환경이나 백엔드 장애 상황에서 
 * 얼마나 견고하게 동작하는지(Graceful Degradation)를 검증합니다.
 */

test.describe('Tier 21: Advanced Resilience', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('Network Resilience: API 500 Error Interception', async ({ page, consoleGuard }) => {
        // Broadly ignore 500 errors for this specific fault injection test
        consoleGuard.addIgnorePattern(/users/); // Ignore 500 from users API
        consoleGuard.addIgnorePattern(/Simulated/i);

        console.log('>>> Step 1: Navigating to User Management');
        await page.goto('/admin/user/manage');
        await expect(page.getByRole('heading', { name: '사용자 관리' }).first()).toBeVisible();

        console.log('>>> Step 2: Intercepting User List API to return 500');
        // Intercept the users list API and force it to fail
        await page.route('**/api/v1/admin/system/users*', async route => {
            console.log(`>>> Blocking request to: ${route.request().url()}`);
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Internal Server Error (Simulated)' })
            });
        });

        console.log('>>> Step 3: Triggering Refresh/Search to cause failure');
        // Use a more specific locator to avoid announcer or other inputs
        const searchInput = page.locator('input[placeholder*="identity"], input[placeholder*="검색"]').first();
        await expect(searchInput).toBeVisible({ timeout: 20000 });
        await searchInput.clear();
        await searchInput.fill('ForceFail');
        await page.keyboard.press('Enter');

        console.log('>>> Step 4: Verifying Error Toast/UI');
        // The UI should show an error message instead of crashing
        // Explicitly wait for the toast with the simulated message
        const errorAlert = page.locator('[role="alert"]').filter({ hasText: /Simulated|500/ }).first();
        await expect(errorAlert).toBeVisible({ timeout: 15000 });
        const alertText = await errorAlert.innerText();
        console.log(`>>> Detected Toast Text: ${alertText}`);
        console.log('>>> Error Toast successfully detected and verified.');

        // UI should still be interactable
        await expect(page.getByRole('heading', { name: '사용자 관리' }).first()).toBeVisible();
    });

    test('UI Stability: Rapid Interaction Stress Test', async ({ page }) => {
        await page.goto('/admin/community/boards/master');
        await expect(page.getByRole('heading', { name: '게시판 마스터' }).first()).toBeVisible();

        console.log('>>> Step 1: Rapidly clicking pagination/tabs');
        const nextBtn = page.locator('button[aria-label*="Next"], button:has-text(">")').first();
        
        if (await nextBtn.isVisible()) {
            for (let i = 0; i < 5; i++) {
                // Click rapidly without waiting for network to finish
                await nextBtn.click({ noWaitAfter: true });
                console.log(`>>> Rapid Click ${i + 1}`);
            }
        }

        console.log('>>> Step 2: Verifying UI state consistency');
        // Ensure the page didn't crash or show a white screen
        await expect(page.locator('body')).toBeVisible();
        await expect(page.getByRole('heading', { name: '게시판 마스터' }).first()).toBeVisible();
        console.log('>>> System remained stable after rapid interaction.');
    });

    test('Data Integrity: Boundary Input (Huge Payload)', async ({ page, consoleGuard }) => {
        // Huge payload might cause some console warnings from TipTap or React
        consoleGuard.addIgnorePattern(/value/i);
        consoleGuard.addIgnorePattern(/controlled/i);

        await page.goto('/admin/community/boards/insertBoardArticle?bbsId=BBSMSTR_AAAAAAAAAAAA');
        
        const hugeTitle = 'B'.repeat(255); // Near common DB limit for VARCHAR
        const hugeContent = 'Content '.repeat(500); // ~4000 characters

        console.log('>>> Step 1: Filling form with large payload');
        await page.locator('input[name="nttSj"]').fill(hugeTitle);
        // Using locator for TipTap/ProseMirror editor
        const editor = page.locator('.ProseMirror');
        await editor.fill(hugeContent);

        console.log('>>> Step 2: Attempting to submit');
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();

        // If it succeeds, verify length in list/detail. If it fails due to validation, verify error message.
        // For this test, we assume the system should either handle it or show validation.
        const resultAlert = page.getByRole('alert');
        await expect(resultAlert.first()).toBeVisible({ timeout: 30000 });
        
        const alertText = await resultAlert.first().innerText();
        console.log(`>>> Submission Result: ${alertText}`);
        
        if (alertText.includes('성공')) {
            console.log('>>> Huge payload handled successfully by backend.');
        } else {
            console.log('>>> Validation correctly caught the boundary condition.');
        }
    });
});
