import { test, expect } from './fixtures/base-test';

/**
 *  보드 기사 유효성 검증 테스트 (Board Article Validation Test)
 * This test verifies the end-to-end flow of creating and viewing board articles,
 * ensuring that the frontend-to-backend mapping and rendering logic are stable.
 */

test.describe('Board Article Lifecycle Management', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test.beforeEach(async ({ page }) => {
        // Hydration and other common error filters
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                const text = msg.text();
                if (text.includes('Hydration') || text.includes('chrome-extension')) return;
                console.error(`[CONSOLE ERROR] ${text}`);
            }
        });

        // Network error logging
        page.on('requestfailed', request => {
            console.error(`[REQUEST FAILED] ${request.url()}: ${request.failure()?.errorText}`);
        });

        page.on('response', response => {
            if (response.status() === 404) {
                console.error(`[404 NOT FOUND] ${response.url()}`);
            }
        });
    });

    test('Create new article and verify rendering in detail view (List Template)', async ({ page }) => {
        const testTitle = `E2E Article List ${Date.now()}`;
        const testContent = `Playwright Test Content ${new Date().toISOString()}`;
        const testBbsId = 'BBSMSTR_AAAAAAAAAAAA';

        await executeBoardArticleTest(page, testTitle, testContent, testBbsId);
    });

    test('Create new article and verify rendering in detail view (Q&A Template)', async ({ page }) => {
        const testTitle = `E2E Article QNA ${Date.now()}`;
        const testContent = `Playwright Test Content ${new Date().toISOString()}`;
        const testBbsId = 'BBSMSTR_DDDDDDDDDDDD';

        await executeBoardArticleTest(page, testTitle, testContent, testBbsId);
    });

    test('Create new article and verify rendering in detail view (Calendar Template)', async ({ page }) => {
        const testTitle = `E2E Article Calendar ${Date.now()}`;
        const testContent = `Playwright Test Content ${new Date().toISOString()}`;
        const testBbsId = 'BBSMSTR_EEEEEEEEEEEE';

        await executeBoardArticleTest(page, testTitle, testContent, testBbsId);
    });
});

async function executeBoardArticleTest(page: any, testTitle: string, testContent: string, testBbsId: string) {
    console.log(`>>> Step 1: Navigating to Article Write Page for BBS: ${testBbsId}`);
    await page.goto('/admin/community/boards/write', { waitUntil: 'networkidle' });

    console.log('>>> Step 2: Filling Article Data');
    await page.locator('input[name="bbsId"]').fill(testBbsId);
    await page.locator('input[name="nttSj"]').fill(testTitle);
    await page.locator('textarea[name="nttCn"]').fill(testContent);

    console.log('>>> Step 3: Submitting Article');
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();

    // Wait for redirect to list
    console.log('>>> Waiting for redirect to list...');
    await page.waitForURL(url => url.pathname.includes('/admin/community/boards/selectBoardList'), { timeout: 15000 });
    console.log(`>>> Redirected to: ${page.url()}`);
    
    await page.waitForLoadState('networkidle');

    console.log('>>> Step 4: Verification - Searching for the article');
    // Actual search input in BoardListClient
    const searchInput = page.locator('input[placeholder*="어떤"], input[placeholder*="검색"]');
    await searchInput.fill(testTitle);
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(3000); // Wait for list animation/refresh
    
    // Use text-based selector since it's a Card, not a Table Row
    const articleCard = page.locator(`text=${testTitle}`).first();
    try {
        await expect(articleCard).toBeVisible({ timeout: 10000 });
        console.log('>>> Article found in list view');
    } catch (e) {
        console.error('>>> Article NOT found in list. Saving state.');
        await page.screenshot({ path: `playwright/screenshots/list-fail-${testBbsId}-${Date.now()}.png`, fullPage: true });
        throw e;
    }

    console.log('>>> Step 5: Rendering Check - Opening Detail View');
    // Click the title link specifically to ensure navigation
    const titleLink = page.locator(`a:has-text("${testTitle}")`).first();
    if (await titleLink.count() > 0) {
        await titleLink.click();
    } else {
        await articleCard.click();
    }
    
    // Wait for detail page
    await page.waitForURL(url => url.pathname.includes('/admin/community/boards/detail'), { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Verify content
    const pageContent = await page.content();
    expect(pageContent).toContain(testTitle);
    expect(pageContent).toContain(testContent);
    
    console.log(`>>> SUCCESS: Board Article flow is fully operational for ${testBbsId}`);
}
