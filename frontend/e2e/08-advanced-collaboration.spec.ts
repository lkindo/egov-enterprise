import { test, expect } from './fixtures/base-test';

/**
 * Tier 8: Advanced Collaboration & Intelligence
 * 실제 UI 상호작용을 통한 협업 도구 및 지능형 분석 기능 검증
 */
test.describe('Tier 8: Advanced Collaboration & Intelligence', () => {
    test.use({ 
        storageState: 'playwright/.auth/admin.json',
        viewport: { width: 1920, height: 1080 }
    });

    // [E2E 감사 Phase3 중복제거] 삭제됨: 'Send Note to Administrative User' — 동일 경로
    // (/admin/collaboration/mail-send → mail-history)를 13-mail이 send/delete/multi/validation까지 소유.
    // 08은 아래 고유 커버리지(주소록 등록, Intelligence 엑셀 내보내기)만 유지한다.

    test('Collaboration: Register New Identity Node (Address Book)', async ({ collabPage, page }) => {
        console.log('\n>>> Starting Collaboration: Register Identity Flow');
        
        const suffix = Math.random().toString(36).substring(7);
        const testName = `Identity_${suffix}`;
        const testEmail = `${testName}@egov.enterprise.com`;
        
        await collabPage.goto();
        await collabPage.createContact(testName, testEmail);
        
        console.log('>>> Identity registered. Verifying visibility in Network Index.');
        // [2026-07-27 정정] 종전 기대는 허브(/admin/collaboration?tab=ADDRESS_BOOK) 였다. 그러나 앱은
        // 등록 성공 시 주소록 목록 라우트로 이동하도록 명시 구현돼 있다(AddressBookInsertHubClient 의 router.push).
        await expect(page).toHaveURL(/\/admin\/collaboration\/address-book\/select-address-book-list/);
        await collabPage.verifyIdentityInList(testName);
    });

    test('Intelligence: Dashboard Interaction & Excel Export', async ({ statsPage }) => {
        console.log('\n>>> Starting Intelligence: Dashboard Validation');
        
        await statsPage.goto();
        await statsPage.verifyChartsVisible();

        // [2026-07-27] 종전의 `changePeriod('MONTHLY_BATCH (30D)')` 를 걷어냈다 — 그 셀렉트는
        // onChange 없는 장식 컨트롤이었고 감사 P0(4dcee3014)에서 제거됐다. 상세는 StatsPage 주석.
        await statsPage.refresh();

        // 엑셀 내보내기 검증
        console.log('>>> Verifying Excel Export capability');
        const download = await statsPage.exportExcel();
        // [2026-07-27 정정] 기대 파일명이 'system_intelligence_stats' 로 굳어 있었으나 실제 산출물은
        // `system_connect_stats_YYYY-MM-DD.csv` 다(AdminStatsClient 의 DataExportExcel filename).
        // 접속 집계를 내보내는 버튼이므로 현행 이름이 내용과 더 맞는다 — 단언을 실물에 맞춘다.
        expect(download.suggestedFilename()).toContain('system_connect_stats');
    });

    // [E2E 감사 Phase3 중복제거] 삭제됨: 'Exploratory: Tier-1 User Portal Coverage Gap Check' —
    // '/' 포털 스모크는 01-core-base가 소유하며, 이 테스트는 console.warn만 할 뿐 gap을 단언하지 않던 무단언 탐색이었음.
});
