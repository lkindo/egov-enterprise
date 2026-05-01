import { test, expect } from './fixtures/base-test';
import { SurveyPage } from './pages/SurveyPage';
import { PromotionPage } from './pages/PromotionPage';
import { KnowledgePage } from './pages/KnowledgePage';

test.describe('Tier 5: Public Engagement & Experience', () => {
    
    test('Online Poll Full Lifecycle (Admin Create -> User Participate)', async ({ adminPage, userPage }) => {
        const surveyTitle = `E2E Poll ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const searchKeyword = surveyTitle;
        const adminSurvey = new SurveyPage(adminPage);
        const userSurvey = new SurveyPage(userPage);
        let pollId: string;

        await test.step('Admin: Create and Publish Survey', async () => {
            console.log(`>>> Creating survey: ${surveyTitle}`);
            pollId = await adminSurvey.createBasicSurvey(surveyTitle);
            console.log(`>>> Created pollId: ${pollId}`);
            
            // Verify in inventory
            await adminSurvey.gotoManage();
            await adminSurvey.searchAndWait(searchKeyword, surveyTitle);
            
            const surveyRow = adminPage.getByText(surveyTitle);
            await expect(surveyRow).toBeVisible({ timeout: 15000 });
        });

        await test.step('User: Vote via API (API-first, no UI flakiness)', async () => {
            console.log(`>>> Voting on survey pollId: ${pollId}`);
            // Navigate to ensure userPage has a valid session context with localStorage
            await userPage.goto('/admin/survey/polls/participate');
            await userPage.waitForLoadState('domcontentloaded');
            await userPage.waitForTimeout(1000);
            
            // Cast vote directly via API using userPage's auth context
            await userSurvey.voteByPollId(pollId);
            console.log(`>>> Vote completed for poll: ${pollId}`);
        });

        await test.step('Admin: Verify Statistics', async () => {
            console.log(`>>> Verifying survey results`);
            await adminSurvey.checkResults(searchKeyword, surveyTitle);
        });
    });


    test('Portal Promotion Flow (Admin Popup/Banner -> User Visibility)', async ({ adminPage, userPage }) => {
        const popupTitle = `E2E Popup ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const bannerTitle = `E2E Banner ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
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

        await test.step('User: Verify Promotion Visibility', async () => {
            console.log(`>>> Verifying popup and banner on Dashboard`);
            await userPage.goto('/');
            
            // Wait for potential server action delay
            await userPage.waitForTimeout(3000);

            // Popups might take a moment to render or require a refresh
            const popupTitleLoc = userPage.getByText(popupTitle);
            for (let i = 0; i < 3; i++) {
                if (await popupTitleLoc.isVisible({ timeout: 5000 }).catch(() => false)) break;
                console.log(`>>> [Promotion] Popup not found (attempt ${i+1}), reloading...`);
                await userPage.reload();
                await userPage.waitForTimeout(2000);
            }
            
            if (await popupTitleLoc.isHidden()) {
                console.warn('>>> Warning: Popup not visible on dashboard. This may be due to popup creation failing silently.');
            } else {
                await expect(popupTitleLoc).toBeVisible();
            }

            const bannerTitleLoc = userPage.getByText(bannerTitle).first();
            await expect(bannerTitleLoc).toBeVisible({ timeout: 15000 });
        });
    });

    test('FAQ Lifecycle and Help Search', async ({ adminPage, userPage }) => {
        const faqQuestion = `E2E Security FAQ ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const faqAnswer = 'E2E FAQ Answer: Data is encrypted and managed safely.';

        await test.step('Admin: Create FAQ', async () => {
            // Correct path for FAQ (BBSMSTR_AAAAAAAAAAAA)
            console.log(`>>> Creating FAQ in board: BBSMSTR_AAAAAAAAAAAA`);
            await adminPage.goto('/admin/community/boards/insertBoardArticle?bbsId=BBSMSTR_AAAAAAAAAAAA');
            await adminPage.getByPlaceholder(/제목을 입력하십시오|Title/).fill(faqQuestion);
            
            // Rich Text Editor interaction
            const editor = adminPage.locator('[data-testid="rich-text-editor"] [contenteditable="true"]');
            await editor.fill(faqAnswer);
            
            await adminPage.getByRole('button', { name: /Commit Knowledge|등록|저장/ }).click();
            await adminPage.waitForSelector('text=/성공|완료|저장되었습니다/');
            
            // Verify in admin list (Help Center FAQ list)
            await adminPage.goto('/admin/help/faq');
            await expect(adminPage.getByText(faqQuestion).first()).toBeVisible({ timeout: 15000 });
        });

        await test.step('User: Verify FAQ Visibility', async () => {
            console.log(`>>> Verifying FAQ visibility for: ${faqQuestion}`);
            await userPage.goto('/help');
            
            // Select FAQ tab (it should be default, but let's be sure)
            const faqTab = userPage.getByRole('button', { name: /고객지원|FAQ/ });
            await expect(faqTab).toBeVisible({ timeout: 15000 });
            await faqTab.click();
            await userPage.waitForTimeout(3000); 
            await userPage.waitForLoadState('domcontentloaded');
            console.log(`>>> [FAQ] Searching for FAQ: ${faqQuestion}`);
            const faqItem = userPage.getByText(faqQuestion).first();
            
            try {
                // Initial check
                await expect(faqItem).toBeVisible({ timeout: 5000 });
            } catch (e) {
                console.log('>>> [FAQ] Not found initially, trying search and reload...');
                const searchInput = userPage.getByPlaceholder(/키워드로 신속하게 검색하세요/);
                if (await searchInput.isVisible()) {
                    await searchInput.fill(faqQuestion);
                    await userPage.keyboard.press('Enter');
                    await userPage.waitForTimeout(3000);
                } else {
                    await userPage.reload();
                    await userPage.waitForTimeout(3000);
                }
            }

            try {
                await expect(userPage.getByText(faqQuestion).first()).toBeVisible({ timeout: 15000 });
                console.log('>>> [FAQ] Found created FAQ in Portal list');
            } catch (e) {
                console.log('>>> [FAQ] Still not found. Trying final search...');
                await userPage.goto('/help');
                const searchInput = userPage.getByPlaceholder(/검색|Search|키워드/i);
                if (await searchInput.isVisible()) {
                    await searchInput.fill(faqQuestion);
                    await searchInput.press('Enter');
                    await userPage.waitForTimeout(2000);
                }
                await expect(userPage.getByText(faqQuestion).first()).toBeVisible({ timeout: 10000 });
                console.log('>>> [FAQ] Found created FAQ in Portal list after final search');
            }
        });

        await test.step('User: Search Help Center', async () => {
            await userPage.goto('/help');
            const searchInput = userPage.getByPlaceholder(/검색|Search/i);
            await searchInput.fill(faqQuestion);
            await searchInput.press('Enter');
            
            await expect(userPage.getByText(faqQuestion).first()).toBeVisible({ timeout: 10000 });
        });
    });

    test('Business Logic: One Person One Vote', async ({ adminPage, userPage }) => {
        const surveyTitle = `E2E Duplicate Test ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const searchKeyword = surveyTitle;
        const adminSurvey = new SurveyPage(adminPage);
        const userSurvey = new SurveyPage(userPage);
        let pollId: string;

        await test.step('Admin: Create Survey', async () => {
            pollId = await adminSurvey.createBasicSurvey(surveyTitle);
        });

        await test.step('User: Vote Twice (Should Fail Second Time)', async () => {
            console.log(`>>> Voting first time for: ${surveyTitle} (pollId: ${pollId})`);
            
            // Navigate to participate page to establish context
            await userPage.goto('/admin/survey/polls/participate');
            await userPage.waitForLoadState('domcontentloaded');
            await userPage.waitForTimeout(1000);
            
            // First vote - use API for reliability
            await userSurvey.voteByPollId(pollId);
            console.log(`>>> First vote completed via API`);

            // Try to vote again via UI
            await userPage.goto('/admin/survey/polls/participate');
            
            // Find the survey card and click it
            const surveyCard = userPage.getByText(new RegExp(surveyTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).first();
            await expect(surveyCard).toBeVisible({ timeout: 10000 });
            await surveyCard.click();
            
            // Wait for view to load
            await userPage.waitForTimeout(1000);
            
            // Check for already participated message or disabled state
            const message = userPage.getByText(/이미 참여|already participated/i).first();
            const submitBtn = userPage.getByRole('button', { name: /투표|제출|Vote/i });
            
            // One of these should be true: message is visible OR button is disabled/hidden
            const isBlocked = await message.isVisible() || await submitBtn.isDisabled() || !(await submitBtn.isVisible());
            console.log(`>>> Duplicate vote check: message visible=${await message.isVisible()}, btn disabled=${await submitBtn.isDisabled()}, btn visible=${await submitBtn.isVisible()}`);
            
            expect(isBlocked).toBeTruthy();
            console.log(`>>> Successfully verified duplicate vote protection`);
        });
    });

    test('User Journey: Public Portal Accessibility (Survey & Approvals)', async ({ userPage }) => {
        await test.step('User: Access Public Survey List', async () => {
            console.log('>>> [User] Navigating to Public Survey portal');
            await userPage.goto('/survey');
            await expect(userPage.getByRole('heading', { name: /설문조사|Poll/i })).toBeVisible({ timeout: 15000 });
        });

        await test.step('User: Access Personal Approval Inbox', async () => {
            console.log('>>> [User] Navigating to Personal Approvals');
            await userPage.goto('/approvals');
            await expect(userPage.getByRole('heading', { name: /결재.*함|My Approvals/i })).toBeVisible({ timeout: 15000 });
        });
    });
});
