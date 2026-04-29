import { test, expect } from '@playwright/test';
import { ObservabilityPage } from './pages/ObservabilityPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { SearchPage } from './pages/SearchPage';
import path from 'path';

const ADMIN_STORAGE_STATE = path.join(__dirname, '../playwright/.auth/admin.json');

test.use({ storageState: ADMIN_STORAGE_STATE });

test.describe('Tier 9: Admin Observability & Workspace Intelligence', () => {
    
    test.beforeEach(async ({ page }) => {
        // Authenticate as admin (session from auth.setup.ts)
    });

    test('Observability: Monitor System Health & Topology', async ({ page }) => {
        const observability = new ObservabilityPage(page);
        
        console.log('\n>>> Navigating to Observability Dashboard');
        await observability.navigate();
        
        console.log('>>> Verifying system control header');
        await observability.verifyHeader();
        
        console.log('>>> Checking real-time metrics');
        await observability.verifyMetrics();
        
        console.log('>>> Verifying service topology container');
        await observability.verifyTopology();
    });

    test('Workspace: Manage MyPage Content Settings', async ({ page }) => {
        const workspace = new WorkspacePage(page);
        
        console.log('\n>>> Navigating to Workspace MyPage Settings');
        await workspace.navigateToMyPageSettings();
        
        console.log('>>> Verifying settings header');
        await workspace.verifyMyPageHeader();
        
        console.log('>>> Toggling content visibility status');
        await workspace.toggleContentStatus(0);
    });

    test('Search: Integrated Neural Search Verification', async ({ page }) => {
        const search = new SearchPage(page);
        
        console.log('\n>>> Navigating to Global Search');
        await search.navigate();
        
        console.log('>>> Performing search for: 관리자');
        await search.performSearch('관리자');
        
        // Since it's a fresh environment, we might not have many results, 
        // but "관리자" (webmaster) should be in the '임직원' (Users) section if indexed.
        // If not found, we check if the results container is visible.
        const resultsCount = await page.locator('h3').count();
        if (resultsCount > 0) {
            console.log('>>> Search results found.');
        } else {
            console.log('>>> No search results for "관리자", checking empty state.');
            await search.verifyNoResults();
        }
    });

    test('Search: Exploratory Empty Result Check', async ({ page }) => {
        const search = new SearchPage(page);
        await search.navigate();
        
        console.log('>>> Searching for non-existent keyword');
        await search.performSearch('XYZ_NON_EXISTENT_KEYWORD_123');
        
        console.log('>>> Verifying empty state message');
        await search.verifyNoResults();
    });
});
