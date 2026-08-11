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
            
            const surveyRow = adminPage.getByText(surveyTitle).first();
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
            await promo.gotoBannerPopupAdmin(); // Fixed method name
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

            // [E2E 감사 B] else-warn 통과 제거 — 관리자가 만든 팝업/배너가 사용자에게 실제로 보여야 한다(무조건 단언).
            // 보이지 않으면 생성이 조용히 실패했거나 노출 로직이 깨진 것이므로 실패 처리한다.
            await expect(popupTitleLoc.first()).toBeVisible({ timeout: 10000 });

            // [2026-07-27 결정적 검증] 메인 배너는 **한 번에 한 장만** 렌더하는 캐러셀이다
            //   (BannerSlider: `banners[currentIndex]`, 5초마다 회전). 그래서 "새 배너가 보이는가"를
            //   리로드로만 확인하면 슬라이드 순서에 운을 맡기게 된다 — 리로드는 currentIndex 를 0 으로
            //   되돌리므로 새 배너가 뒤쪽이면 **몇 번을 새로고침해도 영원히 보이지 않는다.**
            //   (실제로 E2E 배너가 7건까지 누적되자 이 테스트는 격리 실행에서도 100% 실패했다.)
            //   → 순서에 의존하지 않도록 '다음 슬라이드'로 한 바퀴 순회하며 찾는다.
            const bannerTitleLoc = userPage.getByText(bannerTitle).first();
            const nextSlideBtn = userPage.getByRole('button', { name: '다음 슬라이드' });

            if (!(await bannerTitleLoc.isVisible({ timeout: 5000 }).catch(() => false))) {
                // 슬라이드가 1장뿐이면 이동 버튼이 없다(그 경우 위 검사로 이미 판정된다).
                const hasNext = await nextSlideBtn.isVisible({ timeout: 5000 }).catch(() => false);
                if (hasNext) {
                    // 한 바퀴 돌면 반드시 만난다. 여유를 두되 무한 루프는 만들지 않는다.
                    for (let i = 0; i < 20; i++) {
                        await nextSlideBtn.click();
                        if (await bannerTitleLoc.isVisible({ timeout: 1000 }).catch(() => false)) break;
                    }
                }
            }

            await expect(bannerTitleLoc).toBeVisible({ timeout: 10000 });
        });
    });

    test('FAQ Lifecycle and Help Search', async ({ adminPage, userPage }) => {
        const faqQuestion = `E2E Security FAQ ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const faqAnswer = 'E2E FAQ Answer: Data is encrypted and managed safely.';
        const knowledge = new KnowledgePage(adminPage);

        await test.step('Admin: Create FAQ', async () => {
            await knowledge.gotoFAQ();
            await knowledge.createFAQ(faqQuestion, faqAnswer);
            
            // Verify in admin list (Help Center FAQ list)
            await adminPage.goto('/admin/help/faq');
            await expect(adminPage.getByText(faqQuestion).first()).toBeVisible({ timeout: 15000 });
        });

        await test.step('User: Verify FAQ Visibility', async () => {
            console.log(`>>> Verifying FAQ visibility for: ${faqQuestion}`);
            await userPage.goto('/help');
            
            // Select FAQ tab (it should be default, but let's be sure)
            const faqTab = userPage.getByRole('button', { name: /고객지원|FAQ/ }).first();
            await expect(faqTab).toBeVisible({ timeout: 15000 });
            await faqTab.click();
            await userPage.waitForTimeout(3000); 
            await userPage.waitForLoadState('domcontentloaded');
            
            console.log(`>>> [FAQ] Checking visibility for: ${faqQuestion}`);
            const faqItem = userPage.getByText(faqQuestion).first();
            
            // Eventual consistency retry loop
            for (let i = 0; i < 5; i++) {
                if (await faqItem.isVisible({ timeout: 2000 }).catch(() => false)) break;
                
                console.log(`>>> [FAQ] Not found (attempt ${i+1}), searching/reloading...`);
                const searchInput = userPage.getByPlaceholder(/검색|Search|키워드/i);
                if (await searchInput.isVisible()) {
                    await searchInput.fill(faqQuestion);
                    await searchInput.press('Enter');
                } else {
                    await userPage.reload();
                }
                await userPage.waitForTimeout(2000);
            }

            await expect(faqItem).toBeVisible({ timeout: 10000 });
            console.log('>>> [FAQ] Found created FAQ in Portal list');
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
            
            // [E2E 감사 B] '!submitBtn.isVisible()' 분기 제거 — 깨진/빈 참여 화면(버튼 미렌더)도 통과시키던
            // 항상-참 disjunct였음. 이미-참여 메시지 또는 명시적 disabled 상태만 유효한 차단 증거로 인정한다.
            const message = userPage.getByText(/이미 참여|already participated|참여.*완료/i).first();
            const submitBtn = userPage.getByRole('button', { name: /투표|제출|Vote/i }).first();

            const messageVisible = await message.isVisible().catch(() => false);
            const btnDisabled = await submitBtn.isDisabled().catch(() => false);
            console.log(`>>> Duplicate vote check: message=${messageVisible}, disabled=${btnDisabled}`);

            expect(messageVisible || btnDisabled, '2차 투표가 차단(이미 참여 메시지 또는 제출 버튼 비활성)되어야 함').toBeTruthy();
            console.log(`>>> Successfully verified duplicate vote protection`);
        });
    });

    test('User Journey: Public Portal Accessibility (Survey & Approvals)', async ({ userPage }) => {
        await test.step('User: Access Public Survey List', async () => {
            console.log('>>> [User] Navigating to Public Survey portal');
            await userPage.goto('/survey');
            await expect(userPage.locator('h1, h2, h3, .title').filter({ hasText: /설문.*조사|Poll/i }).first()).toBeVisible({ timeout: 15000 });
        });

        await test.step('User: Access Personal Approval Inbox', async () => {
            console.log('>>> [User] Navigating to Personal Approvals');
            await userPage.goto('/approvals');
            await expect(userPage.locator('h1, h2, h3, .title').filter({ hasText: /Approval Hub|결재.*|My Approvals/i }).first()).toBeVisible({ timeout: 15000 });
        });
    });
});
