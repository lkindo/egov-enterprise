import { test, expect } from './fixtures/base-test';
import { SurveyPage } from './pages/SurveyPage';
import { PromotionPage } from './pages/PromotionPage';

/**
 * Tier 5: Public Engagement & Experience
 * 대외 서비스 품질 및 사용자 참여 프로세스 검증 (Sequential Flow)
 */
test.describe('Tier 5: Public Engagement & Experience', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });
    
    test('Online Poll Full Lifecycle (Admin Create -> User Participate)', async ({ adminPage, userPage }) => {
        const surveyTitle = `E2E User Satisfaction ${Date.now()}`;
        const survey = new SurveyPage(adminPage);
        const userSurvey = new SurveyPage(userPage);

        await test.step('Admin: Create and Publish Survey', async () => {
            console.log(`>>> Creating survey: ${surveyTitle}`);
            await survey.createBasicSurvey(surveyTitle);
            
            // Verify in inventory
            await survey.gotoManage();
            await survey.searchInput.fill(surveyTitle);
            await expect(adminPage.getByText(surveyTitle)).toBeVisible();
        });

        await test.step('User: Locate and Participate', async () => {
            console.log(`>>> User participating in: ${surveyTitle}`);
            await userSurvey.participate(surveyTitle);
            
            // Verify participation page content
            await expect(userPage.getByText(surveyTitle)).toBeVisible();
        });
    });

    test('Portal Promotion Flow (Admin Popup -> User Visibility)', async ({ adminPage, userPage }) => {
        const popupTitle = `E2E Urgent Notice ${Date.now()}`;
        const promo = new PromotionPage(adminPage);

        await test.step('Admin: Configure Layer Popup', async () => {
            console.log(`>>> Configuring popup: ${popupTitle}`);
            await promo.gotoPromotion();
            await promo.createPopup(popupTitle);
        });

        await test.step('User: Verify Popup and Persistence', async () => {
            console.log('>>> Verifying popup on Dashboard');
            // Navigate to a page where popups are expected
            await userPage.goto('/admin'); 
            
            const popup = userPage.locator('.fixed, .absolute, [role="dialog"]').filter({ hasText: popupTitle }).first();
            await expect(popup).toBeVisible({ timeout: 15000 });
            
            // Find close today button
            const closeToday = popup.locator('button').filter({ hasText: /오늘.*보지.*않기|오늘.*하루|Close.*today/i });
            
            if (await closeToday.isVisible()) {
                console.log('>>> Testing "Close today" persistence');
                await closeToday.click();
                await expect(popup).not.toBeVisible();
                
                await userPage.reload();
                await expect(popup).not.toBeVisible();
            }
        });
    });

    test('Knowledge Base Service (FAQ & Search)', async ({ userPage }) => {
        await test.step('Help Center: FAQ Interaction', async () => {
            await userPage.goto('/help');
            const faqItem = userPage.locator('button', { hasText: /Q\./ }).first();
            
            if (await faqItem.isVisible()) {
                console.log('>>> FAQ items found, testing expansion');
                await faqItem.click();
                await expect(userPage.locator('div', { hasText: /A\./ }).first()).toBeVisible();
            } else {
                console.log('>>> WARNING: No FAQ items found, checking empty state');
                await expect(userPage.getByText(/등록된.*질문이.*없습니다/)).toBeVisible();
            }
        });

        await test.step('Global Help Search', async () => {
            const searchInput = userPage.locator('input[placeholder*="검색"]');
            await searchInput.fill('보안');
            await userPage.waitForTimeout(1000); 
            await expect(userPage.getByText(/보안|검색 결과/i).first()).toBeVisible();
        });
    });
});
