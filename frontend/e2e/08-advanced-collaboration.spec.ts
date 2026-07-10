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
        await expect(page).toHaveURL(/\/admin\/collaboration\?tab=ADDRESS_BOOK/);
        await collabPage.verifyIdentityInList(testName);
    });

    test('Intelligence: Dashboard Interaction & Excel Export', async ({ statsPage }) => {
        console.log('\n>>> Starting Intelligence: Dashboard Validation');
        
        await statsPage.goto();
        await statsPage.verifyChartsVisible();
        
        // 기간 변경 및 새로고침
        await statsPage.changePeriod('MONTHLY_BATCH (30D)');
        await statsPage.refresh();
        
        // 엑셀 내보내기 검증
        console.log('>>> Verifying Excel Export capability');
        const download = await statsPage.exportExcel();
        expect(download.suggestedFilename()).toContain('system_intelligence_stats');
    });

    // [E2E 감사 Phase3 중복제거] 삭제됨: 'Exploratory: Tier-1 User Portal Coverage Gap Check' —
    // '/' 포털 스모크는 01-core-base가 소유하며, 이 테스트는 console.warn만 할 뿐 gap을 단언하지 않던 무단언 탐색이었음.
});
