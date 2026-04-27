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
                console.log(`\n>>> Starting CRUD Flow for: ${template.name}`);
                
                console.log(`>>> Step 1: Navigating to ${template.name} (${template.id})`);
                await page.goto(`/admin/community/boards/insertBoardArticle?bbsId=${template.id}`);
                await expect(page.locator('h1, h2, .title').first()).toBeVisible({ timeout: 20000 });
                
                console.log('>>> Step 2: Creating Article');
                await page.locator('input[name="nttSj"]').fill(template.title);
                console.log('>>> Step 2.5: Filling Content in RichTextEditor');
                
                // Use evaluate to set content directly to the Tiptap editor
                await page.evaluate(() => {
                    const editorElement = document.querySelector('.ProseMirror');
                    if (editorElement && (editorElement as any).editor) {
                        (editorElement as any).editor.commands.setContent('<p>Initial E2E test content.</p>');
                    }
                });
                
                await page.locator('button:has-text("등록"), button:has-text("Commit Knowledge"), button[type="submit"]').first().click();
                
                await expect(page).toHaveURL(/\/admin\/community\/boards\/(selectBoardList|detail)/, { timeout: 20000 });

                console.log('>>> Step 3: Verifying in List and Opening Detail');
                if (page.url().includes('detail')) {
                    await page.goto(`/admin/community/boards/selectBoardList?bbsId=${template.id}`);
                }
                
                await page.waitForSelector('.animate-pulse', { state: 'hidden' }).catch(() => {});
                const searchInput = page.locator('#board-search-input, [data-testid="board-search-input"], input[placeholder*="찾으시나요"], input[placeholder*="검색"]').first();
                await searchInput.fill(template.title);
                await page.locator('button:has-text("조회"), button:has-text("Search")').first().click();
                
                await expect(page.getByText(template.title).first()).toBeVisible({ timeout: 15000 });

                console.log('>>> Step 3.5: Clicking Article Link');
                await page.getByText(template.title).first().click({ timeout: 15000 });

                console.log('\n>>> Step 4: Updating Article');
                const editBtn = page.locator('button:has-text("수정"), button:has-text("Edit"), button:has-text("Entry")').first();
                await editBtn.click();
                await page.locator('input[name="nttSj"]').fill(`${template.title} [Updated]`);
                
                console.log('>>> Injecting content into Tiptap editor via Evaluate');
                await page.evaluate(() => {
                    const editorElement = document.querySelector('.ProseMirror');
                    if (editorElement && (editorElement as any).editor) {
                        (editorElement as any).editor.commands.setContent('<p>Updated content via Evaluate (Ralph Loop Final).</p>');
                    }
                });
                
                await page.waitForTimeout(1000); 

                const saveButton = page.locator('button:has-text("저장"), button:has-text("Update"), button:has-text("Commit")').first();
                
                const responsePromise = page.waitForResponse(resp => 
                    resp.url().includes('saveBoardArticle') || resp.status() === 200, 
                    { timeout: 20000 }
                ).catch(() => null);

                await saveButton.click();
                await responsePromise; 
                
                await expect(page).toHaveURL(/.*\/admin\/community\/boards\/selectBoardList.*/, { timeout: 30000 });
                
                await page.waitForSelector('.animate-pulse', { state: 'hidden' }).catch(() => {});
                await expect(page.getByText(`${template.title} [Updated]`).first()).toBeVisible({ timeout: 15000 });
                
                console.log('>>> Step 4.5: Re-opening Detail for Verification & Deletion');
                await page.getByText(`${template.title} [Updated]`).first().click();
                await expect(page.getByText(`${template.title} [Updated]`)).toBeVisible();

                console.log('>>> Step 5: Deleting Article');
                const deleteBtn = page.locator('button.text-rose-500, button:has-text("삭제"), button:has-text("Delete")').first();
                page.once('dialog', dialog => dialog.accept());
                await deleteBtn.click();
                
                await expect(page).toHaveURL(/\/admin\/community\/boards\/selectBoardList/);
            });
        }
    });

    test.describe('Community Supplementary Services Smoke Check', () => {
        const services = [
            { name: 'Community Hub', url: '/admin/collaboration' },
            { name: 'Online Polls', url: '/admin/survey/manage' },
            { name: 'Smart Scrap', url: '/admin/collaboration/scraps/selectScrapList' },
            { name: 'Corporate Addressbook', url: '/admin/collaboration/address-book/selectAddressBookList' },
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
