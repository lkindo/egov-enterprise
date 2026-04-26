import { test, expect } from './fixtures/base-test';

/**
 * [Tier 3] Business Domain: Board & Community Engagement
 * 
 * 프로젝트의 핵심 비즈니스인 게시판 기능을 심층 검증합니다.
 * 1. 게시판 생성 마법사 (Wizard)
 * 2. 게시글 생명주기 (CRUD) - 일반, Q&A, 일정 템플릿 대응
 * 3. 커뮤니티 부가 서비스 (설문, 스크랩, 주소록)
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
            await boardMasterPage.fillStep2('Knowledge Hub');

            console.log('>>> Step 4: Phase 3 - ACL Permissions');
            await boardMasterPage.fillStep3();

            console.log('>>> Step 5: Phase 4 - Automated Menu Deployment');
            await boardMasterPage.fillStep4(menuName);

            console.log('>>> Step 6: Verifying Deployment Success');
            await boardMasterPage.verifySuccess(menuName);
        });
    });

    test.describe('Article Lifecycle Management', () => {
        // Test various templates
        const templates = [
            { id: 'BBSMSTR_AAAAAAAAAAAA', name: 'General List', title: `General Article ${Date.now()}` },
            { id: 'BBSMSTR_DDDDDDDDDDDD', name: 'Q&A Template', title: `Q&A Question ${Date.now()}` },
        ];

        for (const template of templates) {
            test(`CRUD Flow for ${template.name}`, async ({ page }) => {
                console.log(`>>> Step 1: Navigating to ${template.name} (${template.id})`);
                await page.goto(`/admin/community/boards/insertBoardArticle?bbsId=${template.id}`);
                
                console.log('>>> Step 2: Creating Article');
                await page.locator('input[name="nttSj"]').fill(template.title);
                await page.locator('textarea[name="nttCn"]').fill('This is a test content for article lifecycle.');
                await page.locator('button:has-text("등록"), button[type="submit"]').first().click();
                
                await expect(page).toHaveURL(/\/admin\/community\/boards\/selectBoardList/);

                console.log('>>> Step 3: Verifying in List and Opening Detail');
                const searchInput = page.locator('input[placeholder*="검색"]').first();
                await searchInput.fill(template.title);
                await page.keyboard.press('Enter');
                
                const titleLink = page.getByText(template.title).first();
                await expect(titleLink).toBeVisible({ timeout: 15000 });
                await titleLink.click();

                console.log('>>> Step 4: Updating Article');
                const editBtn = page.locator('button:has-text("수정"), button:has-text("Edit")').first();
                await editBtn.click();
                await page.locator('input[name="nttSj"]').fill(`${template.title} [Updated]`);
                await page.locator('button:has-text("저장"), button:has-text("Update")').first().click();
                
                await expect(page.getByText(`${template.title} [Updated]`)).toBeVisible();

                console.log('>>> Step 5: Deleting Article');
                const deleteBtn = page.locator('button:has-text("삭제"), button:has-text("Delete")').first();
                await deleteBtn.click();
                // Handle alert
                page.on('dialog', dialog => dialog.accept());
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
            { name: 'Electronic Approvals', url: '/admin/approvals' }
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
