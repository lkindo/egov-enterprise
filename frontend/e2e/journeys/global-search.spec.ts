import { test } from '../fixtures/browser-test';
import { SearchPage } from '../pages/SearchPage';

test.describe('전역 검색', () => {
    const ADMIN_STORAGE_STATE = 'playwright/.auth/admin.json';
    test.use({ storageState: ADMIN_STORAGE_STATE });
    test.describe('Admin Observability & Workspace Intelligence', () => {
        test('전역 검색어가 URL에 반영되고 결과 없음 안내를 표시한다', async ({ page }) => {
            const search = new SearchPage(page);
            await search.navigate();
            console.log('>>> Searching for non-existent keyword');
            await search.performSearch('XYZ_NON_EXISTENT_KEYWORD_123');
            console.log('>>> Verifying empty state message');
            await search.verifyNoResults();
        });
    });
});
