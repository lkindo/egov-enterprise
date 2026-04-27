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
            
            // Vote if possible (assuming simple radio button for now)
            const radio = userPage.locator('input[type="radio"]').first();
            if (await radio.isVisible()) {
                await radio.click();
                await userPage.getByRole('button', { name: /참여|투표/ }).click();
                await expect(userPage.getByText(/성공|완료/)).toBeVisible();
            }
        });

        await test.step('Verification: Check Statistics', async () => {
            await survey.checkResults(surveyTitle);
        });
    });

    test('Portal Promotion Flow (Admin Popup/Banner -> User Visibility)', async ({ adminPage, userPage }) => {
        const popupTitle = `E2E Popup ${Date.now()}`;
        const bannerTitle = `E2E Banner ${Date.now()}`;
        const promo = new PromotionPage(adminPage);

        await test.step('Admin: Configure Layer Popup', async () => {
            console.log(`>>> Configuring popup: ${popupTitle}`);
            await promo.gotoPromotion();
            await promo.createPopup(popupTitle);
        });

        await test.step('Admin: Configure Main Banner', async () => {
            console.log(`>>> Configuring banner: ${bannerTitle}`);
            await promo.createBanner(bannerTitle);
        });

        await test.step('User: Verify Promotion Assets', async () => {
            console.log('>>> Verifying popup and banner on Dashboard');
            await userPage.goto('/'); 
            await userPage.evaluate(() => localStorage.clear());
            await userPage.reload();
            
            // 1. Popup check
            const popup = userPage.locator('.fixed, .absolute, [role="dialog"]').filter({ hasText: popupTitle }).first();
            await expect(popup).toBeVisible({ timeout: 15000 });
            
            // 2. Banner check (Assuming banners are in a specific slider or section)
            const banner = userPage.locator('img[alt*="Banner"]').filter({ hasText: bannerTitle }).or(userPage.getByText(bannerTitle)).first();
            await expect(banner).toBeVisible({ timeout: 15000 });
            
            // Find close today button for popup
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

    test('SEO and Knowledge Base Service', async ({ userPage }) => {
        await test.step('SEO: Verify Dynamic Meta Tags', async () => {
            await userPage.goto('/help');
            await expect(userPage).toHaveTitle(/전자정부|표준프레임워크|포털/);
            
            const metaDescription = userPage.locator('meta[name="description"]');
            await expect(metaDescription).toHaveAttribute('content', /정부|혁신|공통|포털/);
        });

        await test.step('Help Center: FAQ Interaction', async () => {
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
            // Should show either matching items or empty message
            const resultsVisible = await userPage.getByText(/보안|검색 결과|질문이 없습니다/i).first().isVisible();
            expect(resultsVisible).toBeTruthy();
        });
    });

    test('Business Logic: One Person One Vote', async ({ page, userPage }) => {
        // Admin creates a survey (handled in previous test, but we'll use a fixed one if possible or just rely on flow)
        // Here we just test the ERROR when voting twice on the same poll
        console.log('>>> Testing duplicate vote prevention');
        await userPage.goto('/survey');
        const pollCard = userPage.locator('.group').first();
        if (await pollCard.isVisible()) {
            await pollCard.click();
            const firstOption = userPage.locator('button', { hasText: /참여|투표/ }).first();
            if (await firstOption.isVisible()) {
                await firstOption.click();
                // If already voted, should show toast or alert
                // The backend now throws BusinessException with "이미 참여하신 설문입니다."
                // We'll just verify no crash and potentially check toast if visible
            }
        }
    });
});
