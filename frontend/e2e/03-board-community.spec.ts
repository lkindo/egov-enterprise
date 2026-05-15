import { test, expect } from './fixtures/base-test';
import { CommunityPage } from './pages/CommunityPage';

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
            await boardMasterPage.fillStep2('지???�브');

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
                // Triple the timeout for this multi-step CRUD flow (120s × 3 = 360s)
                test.slow();
                console.log(`\n>>> Starting CRUD Flow for: ${template.name}`);

                // Handle ANY dialog early (Deletion confirm, Draft restoration confirm, etc.)
                page.on('dialog', async dialog => {
                    console.log(`>>> Dialog detected: [${dialog.message()}] - Auto-accepting.`);
                    await dialog.accept();
                });
                
                const articleTitle = `E2E Article ${Date.now()}`;
                let createdpstId: string | null = null;

                // [Strategy] Intercept API response to capture pstId immediately after creation
                const responseHandler = async (response: import('@playwright/test').Response) => {
                    const url = response.url();
                    const method = response.request().method();
                    // Actual backend URL: /api/v1/boards/posts
                    if (method === 'POST' && url.includes('/api/v1/boards/posts')) {
                        try {
                            const body = await response.json();
                            // Backend ApiResponse format: { success: true, data: pstId }
                            const pstId = body?.data;
                            if (pstId && (typeof pstId === 'number' || typeof pstId === 'string')) {
                                createdpstId = String(pstId);
                                console.log(`>>> [API Intercept] Captured pstId: ${createdpstId}`);
                            }
                        } catch (e) { 
                            console.log(`>>> [API Intercept] Failed to parse response: ${e.message}`);
                        }
                    }
                };
                page.on('response', responseHandler);

                console.log(`>>> Step 1: Navigating to ${template.name} (${template.id})`);
                await page.goto(`/admin/community/boards/insertBoardArticle?bbsId=${template.id}`);
                await expect(page.locator('h1, h2, .title, [data-testid="article-title-input"]').first()).toBeVisible({ timeout: 20000 });
                
                console.log('>>> Step 2: Creating Article');
                const titleInput = page.locator('input[name="pstTtl"], [data-testid="article-title-input"]');
                await expect(titleInput).toBeVisible({ timeout: 15000 });
                await titleInput.fill(articleTitle);

                const editor = page.locator('.ProseMirror, [data-testid="rich-text-editor"] .ProseMirror');
                await expect(editor).toBeVisible({ timeout: 15000 });
                await editor.fill('Initial E2E test content.');

                const commitBtn = page.locator('button:has-text("Commit Knowledge"), button[aria-label="게시글 ?�??]').first();
                await commitBtn.click();

                // Wait for navigation AWAY from the insert page
                await page.waitForURL((url) => !url.href.includes('insertBoardArticle'), { timeout: 30000 });
                page.off('response', responseHandler);

                // If API interception didn't work, try extracting from URL
                if (!createdpstId) {
                    const urlMatch = page.url().match(/[?&]pstId=(\d+)/);
                    if (urlMatch) createdpstId = urlMatch[1];
                }
                console.log(`>>> Post-create URL: ${page.url()} | pstId: ${createdpstId ?? 'NOT FOUND'}`);

                await test.step('User: Navigate to Created Article (Direct)', async () => {
                    // Navigate to list first to ensure it's refreshed
                    await page.goto(`/admin/community/boards/selectBoardList?bbsId=${template.id}`);
                    await page.waitForLoadState('domcontentloaded');
                    
                    // The new Bento Grid UI uses cards with links containing pstId
                    const firstArticleLink = page.locator('a[href*="pstId="], a.group\\/link, table tbody tr td a').first();
                    
                    try {
                        await firstArticleLink.waitFor({ state: 'visible', timeout: 15000 });
                        const linkText = await firstArticleLink.textContent();
                        console.log(`>>> Clicking first article: "${linkText?.trim()}"`); 
                        await firstArticleLink.click();
                        
                        // Detail URL pattern: /boards/detail OR /boards/selectBoardArticle
                        await page.waitForURL(/\/admin\/community\/boards\/(detail|selectBoardArticle)/, { timeout: 20000 });
                        const detailUrlMatch = page.url().match(/[?&]pstId=(\d+)/);
                        if (detailUrlMatch) createdpstId = detailUrlMatch[1];
                        console.log(`>>> Navigated to detail. pstId=${createdpstId}`);
                        
                        await expect(page.getByText(articleTitle)).toBeVisible({ timeout: 15000 });
                    } catch (e) {
                        console.error(`>>> Failed to find article in list. Trying direct ID if available: ${createdpstId}`);
                        if (createdpstId) {
                            await page.goto(`/admin/community/boards/detail?bbsId=${template.id}&pstId=${createdpstId}`);
                            await expect(page.getByText(articleTitle)).toBeVisible({ timeout: 15000 });
                        } else {
                            throw e;
                        }
                    }
                });

                console.log('\n>>> Step 3: Updating Article');
                const editBtn = page.getByLabel('게시글 ?�정').first();
                await editBtn.waitFor({ state: 'visible', timeout: 10000 });
                await editBtn.click();
                
                await expect(page.locator('input[name="pstTtl"]')).toHaveValue(articleTitle, { timeout: 15000 });
                
                const editTitleInput = page.locator('input[name="pstTtl"]');
                await editTitleInput.click();
                await editTitleInput.clear();
                await editTitleInput.fill(`${articleTitle} [Updated]`);
                await page.keyboard.press('Tab');
                
                console.log('>>> Injecting content into Tiptap editor');
                await editor.focus();
                await editor.evaluate(el => el.innerHTML = '<p></p>');
                await page.keyboard.type('Updated content via Playwright type.');
                await page.keyboard.press('Tab');
                await page.waitForTimeout(1000);

                const saveButton = page.locator('button[type="submit"]').filter({ hasText: /Commit Knowledge|Saving Node/ }).first();
                console.log('>>> Clicking Save Button');
                await saveButton.click();
                
                await expect(page.locator("text=/성공적으로|완료되었습니다/").first()).toBeVisible({ timeout: 15000 });
                console.log('>>> Save success toast detected');
                await page.waitForURL(/\/admin\/community\/boards/, { timeout: 30000 });

                await test.step('User: Verify Updated Article (Direct)', async () => {
                    // Navigate back to list to verify update
                    await page.goto(`/admin/community/boards/selectBoardList?bbsId=${template.id}`);
                    await page.waitForLoadState('domcontentloaded');
                    
                    const firstRowLink = page.locator('a[href*="pstId="]').first();
                    await expect(firstRowLink).toContainText('[Updated]', { timeout: 15000 });
                    
                    // Also check detail page
                    await firstRowLink.click();
                    // Use first() to avoid strict mode violation if title appears in both breadcrumb and heading
                    await expect(page.getByText(`${articleTitle} [Updated]`).first()).toBeVisible({ timeout: 15000 });
                    console.log(`>>> Update verified via list and detail.`);
                });

                console.log('>>> Step 4: Deleting Article');
                const deleteBtn = page.getByLabel('게시글 ??��').first();
                await deleteBtn.click();
                await expect(page).toHaveURL(/\/admin\/community\/boards(\/selectBoardList)?/, { timeout: 20000 });
                console.log('>>> Successfully deleted and returned to list.');
            });
        }
    });

    test('Community of Practice (COP) Matrix Verification', async ({ page }) => {
        const communityPage = new CommunityPage(page);
        
        await test.step('Admin: Navigate to Community Matrix', async () => {
            await communityPage.goto();
        });

        await test.step('Admin: Switch Categories and Verify Persistence', async () => {
            await communityPage.selectCategory('COMMUNITY');
            await communityPage.verifyCOPList();
        });

        await test.step('Admin: Access Master Console from Matrix', async () => {
            await communityPage.gotoMaster();
        });
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
