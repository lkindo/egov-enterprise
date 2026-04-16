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
        const testContent = `Playwright Test Content for List Template`;
        const testBbsId = 'BBSMSTR_AAAAAAAAAAAA';

        await executeBoardArticleTest(page, {
            bbsId: testBbsId,
            title: testTitle,
            content: testContent
        });
    });

    test('Create new article and verify rendering in detail view (Q&A Template)', async ({ page }) => {
        const testTitle = `E2E Article QNA ${Date.now()}`;
        const testContent = `Playwright Test Content for Q&A Template`;
        const testBbsId = 'BBSMSTR_DDDDDDDDDDDD';

        await executeBoardArticleTest(page, {
            bbsId: testBbsId,
            title: testTitle,
            content: testContent,
            qnaStatus: 'OPEN',
            qnaCategory: 'Q&A_TECHNICAL_CONSULT'
        });
    });

    test('Create new article and verify rendering in detail view (Calendar Template)', async ({ page }) => {
        const testTitle = `E2E Article Calendar ${Date.now()}`;
        const testContent = `Playwright Test Content for Calendar Template`;
        const testBbsId = 'BBSMSTR_EEEEEEEEEEEE';
        const today = new Date();
        const eventDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        await executeBoardArticleTest(page, {
            bbsId: testBbsId,
            title: testTitle,
            content: testContent,
            eventDate: eventDateStr
        });
    });
});

interface BoardTestParams {
    bbsId: string;
    title: string;
    content: string;
    qnaCategory?: string;
    qnaStatus?: string;
    eventDate?: string;
}

async function executeBoardArticleTest(page: any, params: BoardTestParams) {
    const { bbsId, title, content, qnaCategory, qnaStatus, eventDate } = params;

    console.log(`>>> Step 1: Navigating to Article Write Page for BBS: ${bbsId}`);
    await page.goto('/admin/community/boards/write', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="bbsId"]');

    console.log('>>> Step 2: Filling Article Data');
    await page.locator('input[name="bbsId"]').fill(bbsId);
    await page.locator('input[name="nttSj"]').fill(title);
    await page.locator('textarea[name="nttCn"]').fill(content);

    // Fill optional fields if present
    if (qnaCategory) {
        // Try both hidden input and visible selector if applicable
        const qnaCatInput = page.locator('input[name="qnaCategory"], select[name="qnaCategory"]');
        if (await qnaCatInput.isVisible()) {
            await qnaCatInput.fill(qnaCategory);
        }
    }
    
    if (eventDate) {
        const eventDateInput = page.locator('input[name="eventDate"]');
        if (await eventDateInput.isVisible()) {
            await eventDateInput.fill(eventDate);
        }
    }

    console.log('>>> Step 3: Submitting Article');
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();

    // Wait for redirect to list
    console.log('>>> Waiting for redirect to list...');
    await page.waitForURL(url => url.pathname.includes('/admin/community/boards/selectBoardList'), { timeout: 15000 });
    
    console.log('>>> Step 4: Verification - Searching for the article');
    const searchInput = page.locator('input[placeholder*="어떤"], input[placeholder*="검색"]').first();
    await searchInput.fill(title);
    await page.keyboard.press('Enter');
    
    // Use text-based selector
    const articleCard = page.locator(`text=${title}`).first();
    await expect(articleCard).toBeVisible({ timeout: 10000 });
    console.log('>>> Article found in list view');

    console.log('>>> Step 5: Rendering Check - Opening Detail View');
    const titleLink = page.locator(`a:has-text("${title}")`).first();
    await titleLink.click();
    
    // Wait for detail page
    await page.waitForURL(url => url.pathname.includes('/admin/community/boards/detail'), { timeout: 10000 });
    
    // Verify basis content
    await expect(page.locator(`text=${title}`).first()).toBeVisible();
    await expect(page.locator(`text=${content}`).first()).toBeVisible();

    // Verify template specific fields
    if (bbsId === 'BBSMSTR_DDDDDDDDDDDD') { // Q&A
        if (qnaCategory) {
            await expect(page.locator(`text=${qnaCategory}`).first()).toBeVisible();
        }
        // Should show Solve button if OPEN
        if (qnaStatus === 'OPEN') {
            const solveBtn = page.getByRole('button', { name: /Mark as Solved|해결/i });
            await expect(solveBtn).toBeVisible();
        }
    }

    if (bbsId === 'BBSMSTR_EEEEEEEEEEEE') { // Calendar
        if (eventDate) {
            await expect(page.locator('text=Event Date')).toBeVisible();
            // Checking for partial date string in the Event Date section specifically
            const dayStr = eventDate.split('-')[2];
            const eventDateSection = page.locator('div:has-text("Event Date")').last();
            await expect(eventDateSection.getByText(new RegExp(dayStr))).toBeVisible();
        }
    }
    
    console.log(`>>> SUCCESS: Board Article flow is fully operational for ${bbsId}`);
}
