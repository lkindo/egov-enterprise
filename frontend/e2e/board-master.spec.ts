import { test, expect } from './fixtures/base-test';

test.describe('Board Master Console & Wizard E2E', () => {
    // Tests are scoped to admin project which uses admin.json session
    
    test('Verify Master Console Page and Wizard Entry', async ({ boardMasterPage }) => {
        console.log('>>> Step 1: Navigating to Master Console');
        await boardMasterPage.gotoMaster();
        
        console.log('>>> Step 2: Verifying Page Structure - Master Console');
        await expect(boardMasterPage.page.getByText('Master Console')).toBeVisible();
        await expect(boardMasterPage.wizardButton).toBeVisible();
    });

    test('Full Board Creation Wizard Flow', async ({ boardMasterPage }) => {
        const boardName = `E2E Test Board ${Date.now()}`;
        const menuName = `Menu ${boardName}`;
        
        console.log('>>> Step 1: Starting Wizard from Maker Page');
        await boardMasterPage.gotoMaker();
        
        console.log('>>> Step 2: Step 1 - Basic Info');
        await boardMasterPage.fillStep1(boardName, 'This is an automated E2E test board creation.');
        
        console.log('>>> Step 3: Step 2 - Template Selection');
        await boardMasterPage.fillStep2('Knowledge Hub');
        
        console.log('>>> Step 4: Step 3 - Permission Matrix');
        await boardMasterPage.fillStep3();
        
        console.log('>>> Step 5: Step 4 - Menu Deployment');
        await boardMasterPage.fillStep4(menuName);
        
        console.log('>>> Step 6: Verifying Mission Complete');
        await boardMasterPage.verifySuccess(menuName);
        
        console.log('>>> Step 7: Navigating back to Master Console to verify listed board');
        await boardMasterPage.page.getByRole('button', { name: /게시판 목록 보기/i }).click();
        await expect(boardMasterPage.page.getByText(boardName)).toBeVisible({ timeout: 15000 });
    });
});
