import { test, expect } from './fixtures/base-test';
import { MailPage } from './pages/MailPage';
;

test.describe('Tier 13: Enterprise Mail System E2E', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    let mailPage: MailPage;

    test.beforeEach(async ({ page }) => {
        mailPage = new MailPage(page);
    });

    test('should send a mail and verify it in history', async ({ page }) => {
        const subject = `E2E ${Date.now()}`;
        const content = 'This is an automated test mail content.';
        const recipientSearch = 'webmaster'; // 'admin' returns no matches in current DB

        await mailPage.navigateToSend();
        await mailPage.sendMail(recipientSearch, subject, content);

        // Verification in history
        await mailPage.verifyMailInHistory(subject);
    });

    test('should search and delete a mail from history', async ({ page }) => {
        // First send one to ensure we have something to delete
        const subject = `DEL ${Date.now()}`;
        await mailPage.navigateToSend();
        await mailPage.sendMail('webmaster', subject, 'Cleanup test');

        await mailPage.navigateToHistory();
        
        // Search
        const searchInput = page.getByRole('textbox', { name: '메일 검색' });
        await searchInput.fill(subject);
        await searchInput.press('Enter');
        await page.waitForTimeout(500);

        await mailPage.deleteMail(subject);
    });

    test('Mail: Multi-recipient Dispatch', async ({ page }) => {
        const subject = `MULTI ${Date.now()}`;
        // Recipients separated by comma or semicolon
        const recipients = 'webmaster, TEST1'; 
        
        await mailPage.navigateToSend();
        await mailPage.sendMail(recipients, subject, 'Testing multi-recipient delivery logic.');

        // Verification in history
        await mailPage.verifyMailInHistory(subject);
        console.log('>>> Multi-recipient mail dispatch verified in history');
    });

    test('Mail: Invalid Email Address Validation', async ({ page }) => {
        await mailPage.navigateToSend();
        
        // Input invalid search query that should result in no matches
        const recipientInput = page.getByTestId('mail-recipient-input');
        await recipientInput.fill('NON_EXISTENT_USER_XYZ_123');
        
        // [2026-07-27 정정] 'No Matches Found' 는 저장소에 존재하지 않는 팬텀 문구다.
        // 실측 문구는 '검색 결과가 없습니다.' 이며, MailSendHubClient 는 [P1-1] 에 따라
        // **검색 실패(사용자 검색에 실패했습니다.)와 결과 없음을 구분**한다. 후자만 통과로 인정한다.
        const noMatches = page.getByText('검색 결과가 없습니다.');
        await expect(noMatches).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('사용자 검색에 실패했습니다.')).toHaveCount(0);
        
        console.log('>>> Invalid recipient search caught correctly (No Matches Found)');
    });
});
