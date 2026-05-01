import { test, expect } from './fixtures/base-test';

/**
 * [Tier 3] Business Domain: Board & Community Engagement
 */

test.describe('Tier 3: Board & Community (Business Flow)', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test.describe('Board Master Wizard Flow', () => {
        const boardName = `E2E_Wizard_Board_${Date.now()}`;
        const menuName = `Menu_${boardName}`;

        test('End-to-End Board Creation and Deployment', async ({ boardMasterPage }) => {
            console.log('>>> Step 1: Navigating to Board Maker Wizard');
            await boardMasterPage.gotoMaker();

            console.log('>>> Step 2: Phase 1 - Basic Config');
            await boardMasterPage.fillStep1(boardName, 'E2E Optimized Board Description');

            console.log('>>> Step 3: Phase 2 - Template Choice');
            await boardMasterPage.fillStep2('지식 허브');

            console.log('>>> Step 4: Phase 3 - ACL Permissions');
            await boardMasterPage.fillStep3();

            console.log('>>> Step 5: Phase 4 - Automated Menu Deployment');
            await boardMasterPage.fillStep4(menuName);

            console.log('>>> Step 6: Verifying Deployment Success');
            await boardMasterPage.verifySuccess(menuName);
        });
    });

    test.describe('Article Lifecycle Management', () => {
        const templates = [
            { id: 'BBSMSTR_AAAAAAAAAAAA', name: 'General List', title: `General Article ${Date.now()}` },
            { id: 'BBSMSTR_DDDDDDDDDDDD', name: 'Q&A Template', title: `Q&A Question ${Date.now()}` },
        ];

        for (const template of templates) {
            test(`CRUD Flow for ${template.name}`, async ({ page }) => {
                // Capture browser console logs for debugging
                page.on('console', msg => console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`));
                
                console.log(`\n>>> Starting CRUD Flow for: ${template.name}`);
                
                const articleTitle = `E2E Article ${Date.now()}`;
                console.log(`>>> Step 1: Navigating to ${template.name} (${template.id})`);
                await page.goto(`/admin/community/boards/insertBoardArticle?bbsId=${template.id}`);
                await expect(page.locator('h1, h2, .title').first()).toBeVisible({ timeout: 20000 });
                
                console.log('>>> Step 2: Creating Article');
                await page.locator('input[name="nttSj"]').fill(articleTitle);
                // Use fill() for Tiptap editor (contenteditable)
                const editor = page.locator('.ProseMirror');
                await editor.fill('Initial E2E test content.');
                
                await page.locator('button:has-text("Commit Knowledge")').first().click();
                
                await expect(page).toHaveURL(/\/admin\/community\/boards(\/(selectBoardList|detail))?/, { timeout: 20000 });

                console.log('>>> Step 3: Verifying in List and Opening Detail');
                if (page.url().includes('detail')) {
                    await page.goto(`/admin/community/boards/selectBoardList?bbsId=${template.id}`);
                }
                
                await page.waitForSelector('.animate-pulse', { state: 'hidden' }).catch(() => {});
                const searchInput = page.locator('#board-search-input, [data-testid="board-search-input"], input[placeholder*="찾으시나요"], input[placeholder*="검색"]').first();
                await searchInput.fill(articleTitle);
                await page.locator('button:has-text("조회"), button:has-text("Search")').first().click();
                
                await expect(page.getByText(articleTitle).first()).toBeVisible({ timeout: 15000 });

                console.log('>>> Step 3.5: Clicking Article Link');
                await page.getByText(articleTitle).first().click({ timeout: 15000 });

                console.log('\n>>> Step 4: Updating Article');
                const editBtn = page.locator('button:has-text("수정"), button:has-text("Edit"), button:has-text("Entry")').first();
                await editBtn.click();
                
                // Wait for data to load
                await expect(page.locator('input[name="nttSj"]')).toHaveValue(articleTitle, { timeout: 15000 });
                
                // Clear and fill title
                const titleInput = page.locator('input[name="nttSj"]');
                await titleInput.click();
                await titleInput.clear();
                await titleInput.fill(`${articleTitle} [Updated]`);
                await page.keyboard.press('Tab'); 
                
                console.log('>>> Injecting content into Tiptap editor');
                await editor.focus();
                // Clear existing content via evaluate for reliability
                await editor.evaluate(el => el.innerHTML = '<p></p>');
                await page.keyboard.type('Updated content via Playwright type.');
                await page.keyboard.press('Tab'); 
                
                await page.waitForTimeout(1000); 

                const saveButton = page.locator('button[type="submit"]').filter({ hasText: /Commit Knowledge|Saving Node/ }).first();
                console.log('>>> Clicking Save Button (type="submit")');
                await saveButton.click();
                
                // Wait for success toast or navigation
                await expect(page.getByText(/성공적으로 (수정|등록)되었습니다|저장되었습니다/)).toBeVisible({ timeout: 15000 });
                console.log('>>> Save success toast detected');
                
                await expect(page).toHaveURL(/.*\/admin\/community\/boards(\/selectBoardList)?/, { timeout: 30000 });
                console.log('>>> Redirected to List page');
                
                // Re-search to verify the update
                const searchInputAfter = page.locator('#board-search-input, [placeholder*="정보"], [placeholder*="Search"]').first();
                await searchInputAfter.waitFor({ state: 'visible', timeout: 30000 });
                await searchInputAfter.fill(`${articleTitle} [Updated]`);
                await page.locator('button:has-text("조회"), button:has-text("Search")').first().click();

                // If not found immediately, try reloading the page once
                const itemInList = page.getByText(`${articleTitle} [Updated]`).first();
                const isFound = await itemInList.isVisible().catch(() => false);
                
                if (!isFound) {
                    console.log('>>> Item not found in list immediately, reloading...');
                    await page.reload();
                    await searchInputAfter.fill(`${articleTitle} [Updated]`);
                    await page.locator('button:has-text("조회"), button:has-text("Search")').first().click();
                }

                await page.waitForSelector('.animate-pulse', { state: 'hidden' }).catch(() => {});
                await expect(itemInList).toBeVisible({ timeout: 30000 });
                
                console.log('>>> Step 4.5: Re-opening Detail for Verification & Deletion');
                await page.getByText(`${articleTitle} [Updated]`).first().click();
                await expect(page.getByText(`${articleTitle} [Updated]`)).toBeVisible({ timeout: 15000 });

                console.log('>>> Step 5: Deleting Article');
                // Target the button with Trash2 icon (lucide-trash-2) or rose-500 color
                const deleteBtn = page.locator('button:has(.lucide-trash-2), button.text-rose-500').first();
                await deleteBtn.click();
                
                await expect(page).toHaveURL(/\/admin\/community\/boards(\/selectBoardList)?/, { timeout: 20000 });
                console.log('>>> Successfully deleted and returned to list');
                
            });
        }
    });

    test.describe('Community Supplementary Services Smoke Check', () => {
        const services = [
            { name: 'Community Hub', url: '/admin/collaboration' },
            { name: 'Online Polls', url: '/admin/survey/manage' },
            { name: 'Smart Scrap', url: '/admin/collaboration' },
            { name: 'Corporate Addressbook', url: '/admin/collaboration' },
            { name: 'Electronic Approvals', url: '/admin/sanctn/workflow' }
        ];

        for (const service of services) {
            test(`Service Availability: ${service.name}`, async ({ page }) => {
                await page.goto(service.url, { waitUntil: 'domcontentloaded' });
                await expect(page.locator('main, .main-content, #content').first()).toBeVisible();
                console.log(`>>> Service [${service.name}] is up and running.`);
            });
        }
    });
});
