import { test, expect } from './fixtures/base-test';
import { WorkspacePage } from './pages/WorkspacePage';
import { SearchPage } from './pages/SearchPage';
import path from 'path';

const ADMIN_STORAGE_STATE = path.join(__dirname, '../playwright/.auth/admin.json');

test.use({ storageState: ADMIN_STORAGE_STATE });

test.describe('Tier 9: Admin Observability & Workspace Intelligence', () => {
    
    test.beforeEach(async ({ page }) => {
        // Authenticate as admin (session from auth.setup.ts)
    });

    // [E2E 감사 Phase3 중복제거] 삭제됨: 'Observability: Monitor System Health & Topology' —
    // ObservabilityPage.verifyHeader/Metrics/Topology 동일 검증을 16-system-observability가 소유. 09는 워크스페이스/검색만 유지.

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
        // [E2E 감사 B] 성공 분기 무단언 제거 — 결과가 있으면 결과 노드를, 없으면 빈 상태를 각각 실단언한다.
        const resultsCount = await page.locator('h3').count();
        if (resultsCount > 0) {
            await expect(page.locator('h3').first()).toBeVisible();
            console.log('>>> Search results found and rendered.');
        } else {
            console.log('>>> No search results for "관리자", verifying empty state.');
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
