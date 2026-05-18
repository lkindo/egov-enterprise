import { test, expect } from './fixtures/base-test';
import { CommunityPage } from './pages/CommunityPage';

/**
 * [Tier 3] Business Domain: Board & Community Engagement
 */

test.describe('Tier 3: Board & Community (Business Flow)', () => {
    // 3. 병렬 실행 최적화: 워커 간 독립 실행 보장
    test.describe.configure({ mode: 'parallel' });
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test.describe('Board Master Wizard Flow', () => {
        const workerId = process.env.TEST_WORKER_INDEX || '0';
        const boardName = `E2E_Wizard_Board_${workerId}_${Date.now()}`;
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
            { id: 'BBSMSTR_AAAAAAAAAAAA', name: 'General List' },
            { id: 'BBSMSTR_DDDDDDDDDDDD', name: 'Q&A Template' },
        ];

        for (const template of templates) {
            test(`CRUD Flow for ${template.name}`, async ({ page }) => {
                test.slow();
                console.log(`\n>>> Starting CRUD Flow for: ${template.name}`);

                page.on('dialog', async dialog => {
                    console.log(`>>> Dialog detected: [${dialog.message()}] - Auto-accepting.`);
                    await dialog.accept();
                });
                
                const workerId = process.env.TEST_WORKER_INDEX || '0';
                const articleTitle = `E2E Article W${workerId} ${Date.now()}`;
                let createdpstId: string | null = null;

                const responseHandler = async (response: import('@playwright/test').Response) => {
                    const url = response.url();
                    const method = response.request().method();
                    // Intercept both old and new API paths
                    if (method === 'POST' && (url.includes('/api/v1/boards/posts') || url.includes('/api/v1/bbs'))) {
                        try {
                            const body = await response.json();
                            const pstId = body?.data;
                            if (pstId) {
                                createdpstId = String(pstId);
                                console.log(`>>> [API Intercept] Captured pstId: ${createdpstId}`);
                            }
                        } catch (e: any) { }
                    }
                };
                page.on('response', responseHandler);

                console.log(`>>> Step 1: Navigating to ${template.name} (${template.id})`);
                await page.goto(`/admin/community/boards/insertBoardArticle?bbsId=${template.id}`);
                
                // Enhanced wait for title input
                const titleInput = page.locator('input[data-testid="article-title-input"], input[name="pstTtl"]').first();
                await titleInput.waitFor({ state: 'visible', timeout: 30000 });
                
                console.log('>>> Step 2: Creating Article');
                await titleInput.fill(articleTitle);
                
                const editor = page.locator('[data-testid="rich-text-editor"] .ProseMirror, .ProseMirror').first();
                await editor.fill('Initial E2E test content.');

                const commitBtn = page.locator('button:has-text("Commit Knowledge"), button:has-text("게시글 등록"), button:has-text("저장"), button[aria-label="게시글 저장"]').first();
                await commitBtn.click();

                console.log('>>> Waiting for navigation and toast...');
                // Wait for either navigation or a success toast
                await Promise.race([
                    page.waitForURL((url) => !url.href.includes('insertBoardArticle'), { timeout: 60000, waitUntil: 'domcontentloaded' }),
                    page.waitForSelector('text=/성공|저장|완료/', { timeout: 30000 })
                ]);
                
                page.off('response', responseHandler);

                if (!createdpstId) {
                    const urlMatch = page.url().match(/[?&]pstId=([^&]+)/);
                    if (urlMatch) createdpstId = urlMatch[1];
                }
                console.log(`>>> Post-create URL: ${page.url()} | pstId: ${createdpstId ?? 'NOT FOUND'}`);

                await test.step('User: Navigate to Created Article', async () => {
                    // Force go to list if still on same page or ID not found
                    if (!createdpstId || page.url().includes('insertBoardArticle')) {
                        await page.goto(`/admin/community/boards/selectBoardList?bbsId=${template.id}`);
                    }
                    
                    // 2. Anti-flaky: 스마트 재시도 로직 (데이터가 나타날 때까지 주기적으로 새로고침 및 확인)
                    await expect(async () => {
                        if (createdpstId) {
                            await page.goto(`/admin/community/boards/detail?bbsId=${template.id}&pstId=${createdpstId}`);
                        } else {
                            await page.goto(`/admin/community/boards/selectBoardList?bbsId=${template.id}`);
                            const firstArticleLink = page.locator('a[href*="pstId="], a.group\\/link').first();
                            await firstArticleLink.waitFor({ state: 'visible', timeout: 5000 });
                            await firstArticleLink.click();
                        }
                        await expect(page.getByText(articleTitle).first()).toBeVisible({ timeout: 5000 });
                    }).toPass({ timeout: 30000, intervals: [1000, 2000, 5000] });
                });

                console.log('\n>>> Step 3: Updating Article');
                const editBtn = page.locator('button:has-text("수정"), [aria-label="게시글 수정"], button:has-text("Edit")').first();
                await editBtn.waitFor({ state: 'visible', timeout: 15000 });
                await editBtn.click();
                
                await page.locator('input[name="pstTtl"]').fill(`${articleTitle} [Updated]`);
                await page.locator('.ProseMirror').first().fill('Updated content.');

                const saveButton = page.locator('button[type="submit"]').filter({ hasText: /Commit Knowledge|Saving Node|저장/ }).first();
                await saveButton.click();
                
                // Wait for save action completion (navigation or toast success)
                await Promise.race([
                    page.waitForURL((url) => !url.href.includes('updateBoardArticle') && !url.href.includes('insertBoardArticle'), { timeout: 30000, waitUntil: 'domcontentloaded' }),
                    page.waitForSelector('text=/성공|저장|완료/', { timeout: 15000 })
                ]).catch(() => {
                    console.log('>>> Warning: Save action completion wait timed out, continuing...');
                });
                console.log('>>> Update complete.');

                await test.step('User: Verify Updated Article', async () => {
                    // 2. Anti-flaky: 스마트 재시도 로직 (revalidatePath 반영 지연 방어)
                    await expect(async () => {
                        await page.goto(`/admin/community/boards/selectBoardList?bbsId=${template.id}`);
                        await expect(page.getByText(`${articleTitle} [Updated]`).first()).toBeVisible({ timeout: 5000 });
                    }).toPass({ timeout: 30000, intervals: [1000, 2000, 5000] });
                });

                console.log('>>> Step 4: Deleting Article');
                // Navigate to detail for deletion
                await page.locator(`text=${articleTitle} [Updated]`).first().click();
                
                const deleteBtn = page.locator('button:has-text("삭제"), [aria-label="게시글 삭제"], button:has-text("Delete")').first();
                await deleteBtn.waitFor({ state: 'visible', timeout: 15000 });
                await deleteBtn.click();
                
                // 2. Anti-flaky: 스마트 재시도 로직 (목록에서 완전히 사라졌는지 확인)
                await expect(async () => {
                    await page.goto(`/admin/community/boards/selectBoardList?bbsId=${template.id}`);
                    await expect(page.locator(`text=${articleTitle} [Updated]`).first()).toBeHidden({ timeout: 5000 });
                }).toPass({ timeout: 30000, intervals: [1000, 2000, 5000] });
                
                console.log('>>> Successfully deleted.');
            });
        }
    });

    test('Community of Practice (COP) Matrix Verification', async ({ page }) => {
        const communityPage = new CommunityPage(page);
        await communityPage.goto();
        await communityPage.selectCategory('COMMUNITY');
        await communityPage.verifyCOPList();
        await communityPage.gotoMaster();
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
            });
        }
    });
});
