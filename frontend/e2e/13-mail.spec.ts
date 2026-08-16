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

    test('Mail: Empty Recipient Validation', async ({ page }) => {
        await mailPage.navigateToSend();

        await page.getByTestId('mail-subject-input').fill('Recipient validation');
        await page.getByTestId('mail-content-textarea').fill('Recipient is intentionally empty.');
        await page.getByTestId('mail-send-btn').click();

        await expect(page.getByText('수신자를 선택해 주세요.')).toBeVisible();
        await expect(page).toHaveURL(/\/admin\/collaboration\/mail-send/);
        await expect(page.getByTestId('selected-recipient-badge')).toHaveCount(0);

        console.log('>>> Empty recipient submission blocked correctly');
    });
});
