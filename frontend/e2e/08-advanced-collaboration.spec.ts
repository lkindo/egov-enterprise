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

    test('Collaboration: Send Note to Administrative User', async ({ collabPage, page }) => {
        console.log('\n>>> Starting Collaboration: Send Note Flow');
        
        await collabPage.goto();
        
        // 상세 쪽지 발송 (수신자: 관리자 - 기본 관리자)
        const subject = `E2E Test Note ${Date.now()}`;
        const content = 'This is an automated test note for collaboration matrix validation.';
        
        await collabPage.sendNote('관리자', subject, content);
        
        console.log('>>> Note sent successfully. Verifying redirection to message hub.');
        await expect(page).toHaveURL(/\/admin\/collaboration\/mail-history/);
    });

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

    test('Exploratory: Tier-1 User Portal Coverage Gap Check', async ({ page }) => {
        console.log('\n>>> Exploratory Check: User Portal (Tier-1)');
        
        // 사용자 포털 메인으로 이동
        await page.goto('/');
        
        // 주요 네비게이션 요소 존재 확인 (GNB 등)
        const gnb = page.locator('nav');
        await expect(gnb.first()).toBeVisible();
        
        console.log('>>> Checking for common Tier-1 entry points...');
        const links = await page.locator('a').allInnerTexts();
        const keywords = ['소개', '게시판', '공지', '알림', '가이드'];
        
        const foundKeywords = keywords.filter(k => links.some(l => l.includes(k)));
        console.log(`>>> Found Tier-1 Keywords: ${foundKeywords.join(', ')}`);
        
        // 사각지대 식별: 현재 테스트 코드가 미비한 영역 확인
        // 예: 공지사항 상세 조회, 검색, 마이페이지 등
        if (!foundKeywords.includes('공지')) {
            console.warn('!!! POTENTIAL GAP: Notice board link not found on main page.');
        }
    });
});
