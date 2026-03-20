import { test, expect } from './fixtures/base-test';

test.describe('BBS Module - Optimized with POM', () => {
    // Inject session for specific test run if needed, but baseline uses projects in config
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('BBS List and Search Flow', async ({ bbsPage }) => {
        console.log('>>> Step 1: Navigating to BBS Page');
        await bbsPage.goto();
        
        console.log('>>> Step 2: Verifying Page Structure');
        await bbsPage.verifyPageStructure();

        console.log('>>> Step 3: Performing Search Action');
        await bbsPage.search('공지');
        
        // Final verification post-search
        await expect(bbsPage.dataTable).toBeVisible();
    });

    test('BBS Detail Navigation Flow', async ({ bbsPage }) => {
        console.log('>>> Step 1: Navigating to BBS Page');
        await bbsPage.goto();

        console.log('>>> Step 2: Clicking First Record Row');
        if (await bbsPage.firstRow.isVisible()) {
            await bbsPage.clickFirstRow();
            
            console.log('>>> Step 3: Verifying Detail View Content');
            await bbsPage.verifyDetailView();
        } else {
            console.log('>>> Info: No board articles found for detail view testing');
        }
    });

    // Example of Visual Regression Test (Optional improvement)
    test('BBS Visual Snapshot Check', async ({ page, bbsPage }) => {
        await bbsPage.goto();
        await bbsPage.verifyPageStructure();
        
        // Automated visual diff (Needs --update-snapshots on first run)
        // await expect(page).toHaveScreenshot('bbs-list-view.png', { mask: [page.locator('.timestamp')] });
    });
});
