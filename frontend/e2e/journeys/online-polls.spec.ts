import { expect,test } from '../fixtures/browser-test';
import { SurveyPage } from '../pages/SurveyPage';
test.describe('Public Engagement & Experience', () => {
    test("온라인 투표 생성 → 일반 사용자 참여 → 관리자 목록 검색", async ({ adminPage, userPage }) => {
        const surveyTitle = `E2E Poll ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const searchKeyword = surveyTitle;
        const adminSurvey = new SurveyPage(adminPage);
        const userSurvey = new SurveyPage(userPage);
        let pollSn: number;
        await test.step('Admin: Create and Publish Survey', async () => {
            console.log(`>>> Creating survey: ${surveyTitle}`);
            pollSn = await adminSurvey.createBasicSurvey(surveyTitle);
            console.log(`>>> Created pollSn: ${pollSn}`);
            // Verify in inventory
            await adminSurvey.gotoManage();
            await adminSurvey.searchAndWait(searchKeyword, surveyTitle);
            const surveyRow = adminPage.getByText(surveyTitle).first();
            await expect(surveyRow).toBeVisible({ timeout: 15000 });
        });
        await test.step('User: Vote via API (API-first, no UI flakiness)', async () => {
            console.log(`>>> Voting on survey pollSn: ${pollSn}`);
            // Navigate to ensure userPage has a valid session context with localStorage
            await userPage.goto('/admin/survey/polls/participate');
            await userPage.waitForLoadState('domcontentloaded');
            // Cast vote directly via API using userPage's auth context
            await userSurvey.voteByPollSn(pollSn);
            console.log(`>>> Vote completed for poll: ${pollSn}`);
        });
        await test.step('Admin: Verify Statistics', async () => {
            console.log(`>>> Verifying survey results`);
            await adminSurvey.checkResults(searchKeyword, surveyTitle);
        });
    });
    test('Business Logic: One Person One Vote', async ({ adminPage, userPage }) => {
        const surveyTitle = `E2E Duplicate Test ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const adminSurvey = new SurveyPage(adminPage);
        const userSurvey = new SurveyPage(userPage);
        let pollSn: number;
        await test.step('Admin: Create Survey', async () => {
            pollSn = await adminSurvey.createBasicSurvey(surveyTitle);
        });
        await test.step('User: Vote Twice (Should Fail Second Time)', async () => {
            console.log(`>>> Voting first time for: ${surveyTitle} (pollSn: ${pollSn})`);
            // Navigate to participate page to establish context
            await userPage.goto('/admin/survey/polls/participate');
            await userPage.waitForLoadState('domcontentloaded');
            // First vote - use API for reliability
            await userSurvey.voteByPollSn(pollSn);
            console.log(`>>> First vote completed via API`);
            // Try to vote again via UI
            await userPage.goto('/admin/survey/polls/participate');
            // Find the survey card and click it
            const surveyCard = userPage.getByText(new RegExp(surveyTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')).first();
            await expect(surveyCard).toBeVisible({ timeout: 10000 });
            await surveyCard.click();
            // [E2E 감사 B] '!submitBtn.isVisible()' 분기 제거 — 깨진/빈 참여 화면(버튼 미렌더)도 통과시키던
            // 항상-참 disjunct였음. 이미-참여 메시지 또는 명시적 disabled 상태만 유효한 차단 증거로 인정한다.
            const message = userPage.getByText(/이미 참여|already participated|참여.*완료/i).first();
            const submitBtn = userPage.getByRole('button', { name: /투표|제출|Vote/i }).first();
            await expect(message.or(submitBtn)).toBeVisible({ timeout: 10000 });
            const messageVisible = await message.isVisible().catch(() => false);
            const btnDisabled = await submitBtn.isDisabled().catch(() => false);
            console.log(`>>> Duplicate vote check: message=${messageVisible}, disabled=${btnDisabled}`);
            expect(messageVisible || btnDisabled, '2차 투표가 차단(이미 참여 메시지 또는 제출 버튼 비활성)되어야 함').toBeTruthy();
            console.log(`>>> Successfully verified duplicate vote protection`);
        });
    });
});
