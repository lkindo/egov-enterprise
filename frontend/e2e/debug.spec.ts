import { test, expect } from './fixtures/base-test';
import { format } from 'date-fns';

test.use({ viewport: { width: 1920, height: 1080 } });

test('Debug Popup Creation', async ({ adminPage }) => {
    await adminPage.goto('/admin/system/banner');
    
    // 팝업 설정 탭 이동
    await adminPage.getByRole('button', { name: '팝업 설정' }).click();
    await adminPage.getByRole('button', { name: /신규.*팝업.*등록|신규.*등록/ }).click();
    
    // 폼 입력
    await adminPage.getByLabel(/팝업 타이틀/).fill('Debug Test Popup');
    await adminPage.getByLabel(/게시 시작 시점/).fill('2026-04-28');
    await adminPage.getByLabel(/게시 종료 시점/).fill('2026-05-04');
    await adminPage.getByLabel(/가로 좌표/).fill('0');
    await adminPage.getByLabel(/세로 좌표/).fill('0');
    await adminPage.getByLabel(/가로 폭/).fill('500');
    await adminPage.getByLabel(/세로 높이/).fill('500');
    
    const imagePath = 'e2e/test-assets/dummy_promotion.png';
    await adminPage.setInputFiles('input[type="file"]', imagePath);
    
    // 제출 전 캡처
    await adminPage.screenshot({ path: 'test-results/debug-popup-before.png', fullPage: true });
    
    // 제출
    await adminPage.locator('button').filter({ hasText: /운영.*배포/ }).click();
    await adminPage.waitForTimeout(2000);
    
    // 제출 후 캡처 (에러 메시지 확인용)
    await adminPage.screenshot({ path: 'test-results/debug-popup-after.png', fullPage: true });
});

test('Debug Survey Creation', async ({ adminPage }) => {
    await adminPage.goto('/admin/survey/manage/create');
    await adminPage.locator('#pollNm').fill('Debug Survey');
    
    // 달력 열기
    const datePickers = adminPage.locator('button:has(.lucide-calendar)');
    await datePickers.first().click();
    
    // 현재 열린 달력 선택
    const openPopover = adminPage.locator('[data-radix-popper-content-wrapper]').filter({ visible: true }).first();
    const calendar = openPopover.getByRole('grid');
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 1);
    const targetDay = String(targetDate.getDate());
    
    await calendar.locator('button.e2e-day-button:not(.day-outside)').filter({ hasText: new RegExp(`^${targetDay}$`) }).first().click({ force: true });
    
    if (await openPopover.isVisible()) {
        await adminPage.keyboard.press('Escape');
    }
    
    // 시작 달력이 닫히고, 상태를 캡처
    await adminPage.waitForTimeout(1000);
    await adminPage.screenshot({ path: 'test-results/debug-survey-mid.png', fullPage: true });
    
    // 두번째 달력 열기
    await datePickers.last().click();
    await adminPage.waitForTimeout(1000);
    await adminPage.screenshot({ path: 'test-results/debug-survey-end.png', fullPage: true });
});
