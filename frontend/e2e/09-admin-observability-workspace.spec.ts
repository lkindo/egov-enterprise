import { test } from './fixtures/base-test';
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

    // [2026-08-10 제거] 삭제됨: 'Search: Integrated Neural Search Verification'.
    //
    //   `if (resultsCount > 0) … else …` 의 **두 갈래가 모두 통과 경로**였다. 즉 검색이 결과를 주든
    //   빈 상태를 주든 그린이고, 실질적으로 남는 것은 "페이지가 죽지 않았다" 뿐이다.
    //   게다가 else 분기(`search.verifyNoResults()`)는 바로 아래 'Exploratory Empty Result Check' 와
    //   **완전히 같은 검증**이라, 이 테스트가 하는 일은 좋게 봐야 그 테스트를 확률적으로 한 번 더
    //   돌리는 것이었다.
    //
    //   '관리자' 라는 키워드가 결과를 낼지는 검색 색인 상태에 달려 있어 결정적으로 만들 수 없다.
    //   결과가 있는 경로를 제대로 검증하려면 **이 테스트가 쓸 문서를 직접 만들고 그 고유 제목으로
    //   검색해야** 한다(24·25 가 쓰는 시딩 방식). 인프라가 서면 그 형태로 재작성하는 것이 옳고,
    //   그때까지 결정적인 빈-상태 테스트만 남긴다 — 동전던지기 단언을 커버리지로 세지 않는다.

    test('Search: Exploratory Empty Result Check', async ({ page }) => {
        const search = new SearchPage(page);
        await search.navigate();
        
        console.log('>>> Searching for non-existent keyword');
        await search.performSearch('XYZ_NON_EXISTENT_KEYWORD_123');
        
        console.log('>>> Verifying empty state message');
        await search.verifyNoResults();
    });
});
