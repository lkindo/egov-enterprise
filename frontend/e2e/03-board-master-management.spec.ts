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
        // Go to Master page first to find the "NEW BOARD WIZARD" button
        await boardMasterPage.gotoMaster();
        await boardMasterPage.startWizard();
        
        // Now we should be on the Maker page
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
        // Add explicit wait for frontend state to sync after deletion
        await page.waitForTimeout(3000);
        await boardMasterPage.search(updatedName);
        
        // Use a more resilient check for 0 results
        const rowCount = await page.locator('tr').filter({ hasText: updatedName }).count();
        if (rowCount > 0) {
            console.log('>>> WARNING: Row still visible after search, attempting one more search refresh...');
            await page.waitForTimeout(2000);
            await boardMasterPage.search(updatedName);
        }
        
        await expect(page.locator('tr').filter({ hasText: updatedName })).toHaveCount(0, { timeout: 15000 });

        await errorDetector.verify();
    });
});
