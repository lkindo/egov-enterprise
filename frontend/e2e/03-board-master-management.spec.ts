import { test, expect } from '@playwright/test';
import { BoardMasterPage } from './pages/BoardMasterPage';
import { setupGlobalErrorDetection, ConsoleErrorGuard } from './fixtures/error-detector';

test.describe('Tier 3: Board Master Management (Admin Flow)', () => {
    // Inject Admin Session
    test.use({ storageState: 'playwright/.auth/admin.json' });

    let boardMasterPage: BoardMasterPage;
    let errorDetector: ConsoleErrorGuard;

    test.beforeEach(async ({ page }) => {
        test.setTimeout(300000); // 5 minutes
        boardMasterPage = new BoardMasterPage(page);
        errorDetector = await setupGlobalErrorDetection(page);
    });

    test('Full Board Master Lifecycle: Create -> Update -> Delete', async ({ page }) => {
        const uniqueId = Date.now();
        const boardName = `E2E_Console_Test_${uniqueId}`;
        const boardDesc = `Automated test board created via E2E wizard at ${new Date().toISOString()}`;
        const updatedName = `${boardName}_UPDATED`;
        const updatedDesc = `Updated description via E2E test`;

        console.log('>>> [PRE-REQ] Creating a temporary board via Wizard');
        await boardMasterPage.gotoMaster();
        await boardMasterPage.startWizard();
        
        await boardMasterPage.fillStep1(boardName, boardDesc);
        await boardMasterPage.fillStep2();
        await boardMasterPage.fillStep3();
        await boardMasterPage.fillStep4(`Menu_${boardName}`);
        await boardMasterPage.verifySuccess(`Menu_${boardName}`);

        console.log('\n>>> Step 1: Navigating to Board Master Console');
        await boardMasterPage.gotoMaster();
        await expect(page).toHaveURL(/.*master/);

        console.log(`\n>>> Step 2: Searching for test board: ${boardName}`);
        await boardMasterPage.search(boardName);
        await expect(page.locator('tr').filter({ hasText: boardName }).first()).toBeVisible({ timeout: 15000 });

        console.log('\n>>> Step 3: Opening Settings Modal and Updating Information');
        await boardMasterPage.openSettings(boardName);
        await boardMasterPage.updateSettings({
            name: updatedName,
            description: updatedDesc,
            useAt: 'Y'
        });

        console.log('\n>>> Step 4: Verifying Update in List');
        await boardMasterPage.search(updatedName);
        await expect(boardMasterPage.page.locator('tr').filter({ hasText: updatedName }).first()).toBeVisible({ timeout: 15000 });
        
        console.log('\n>>> Step 5: Deleting the Board Master Permanently');
        await boardMasterPage.deleteBoard(updatedName);

        console.log('\n>>> Step 6: Verifying Deletion');
        await page.waitForTimeout(3000);
        await boardMasterPage.search(updatedName);
        
        // Use not.toContainText on the table container for more reliable verification
        // as StandardDataTable may render a placeholder <tr> even when empty.
        const tableContainer = page.locator('.hub-table-container');
        await expect(tableContainer).not.toContainText(updatedName, { timeout: 15000 });

        await errorDetector.verify();
    });

    test('Validation Edge Case: Creation Failure with Empty Name', async ({ page }) => {
        console.log('>>> Navigating to Maker to test validation failure');
        await boardMasterPage.gotoMaker();
        
        // Fill description but leave name empty
        await boardMasterPage.bbsIntrcnInput.fill('This should fail due to empty name');
        
        // Attempt to click Next - should be disabled or show error
        const nextBtn = boardMasterPage.nextButton;
        const isNextDisabled = await nextBtn.isDisabled();
        
        if (!isNextDisabled) {
            await nextBtn.click();
            // Expect validation message or toast (Zod message: 게시판 명칭은 최소 2글자 이상이어야 합니다)
            await expect(page.locator('.text-red-500').filter({ hasText: '최소 2글자' }).first()).toBeVisible({ timeout: 15000 });
        } else {
            console.log('>>> Next button correctly disabled for empty name');
        }
    });
});

test.describe('Tier 3: Board Master Security (Unauthorized Access)', () => {
    // Inject Regular User Session
    test.use({ storageState: 'playwright/.auth/user.json' });

    test('Access Denied for Regular User', async ({ page }) => {
        console.log('>>> Attempting to access Admin Board Master page as regular user');
        await page.goto('/admin/community/boards/master');
        
        // Should be redirected or show access denied
        const url = page.url();
        if (url.includes('admin/community/boards/master')) {
            // [EXPECT] Verify Access Denied at network level
            // Wait for the specific API to return 403 Forbidden
            const responsePromise = page.waitForResponse(
                response => response.url().includes('/admin/system/board-masters') && response.status() === 403,
                { timeout: 30000 }
            );

            // [EXPECT] Verify Access Denied error UI
            // In the new Premium UI, unauthorized data results in an error state
            const errorDisplay = page.getByTestId('error-state-display').first();
            await expect(errorDisplay).toBeVisible({ timeout: 30000 });
            await expect(errorDisplay).toContainText('Access Denied');
            
            // Finalize network check
            await responsePromise;
            
            // Additional check: Ensure sensitive action buttons are hidden
            const wizardBtn = page.getByRole('button', { name: /생성 마법사|Wizard/i });
            if (await wizardBtn.count() > 0) {
                await expect(wizardBtn.first()).toBeHidden();
            }
            
            console.log('>>> Access correctly restricted (Security confirmed)');
        } else {
            console.log(`>>> Redirected to: ${url} (Expected behavior)`);
            expect(url).not.toContain('admin');
        }
    });
});
