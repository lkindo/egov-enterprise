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
        /*
         * [2026-08-29] 수신자를 ID('webmaster')에서 메일 주소로 바꾼다.
         *
         * 종전에는 맨 ID 를 넣고 UI 가 받아들이는 것을 확인했다. 그런데 서버에는 ID 를 주소로
         * 바꿔 주는 경로가 없다 — recptnPerson 이 아무 변환 없이 SMTP 수신 주소가 된다
         * (MailService → MailAsyncProcessor.emailSender.send). 즉 이 스펙은 **갈 수 없는
         * 주소로 보내는 것을 정상 경로로 고정**하고 있었다. 발송이 @Async 라 실패가 화면에
         * 돌아오지 않아 e2e 에서도 드러나지 않았다.
         */
        const recipientSearch = 'webmaster@example.com';

        await mailPage.navigateToSend();
        await mailPage.sendMail(recipientSearch, subject, content);

        // Verification in history
        await mailPage.verifyMailInHistory(subject);
    });

    test('should search and delete a mail from history', async ({ page }) => {
        // First send one to ensure we have something to delete
        const subject = `DEL ${Date.now()}`;
        await mailPage.navigateToSend();
        await mailPage.sendMail('webmaster@example.com', subject, 'Cleanup test');

        await mailPage.navigateToHistory();
        
        // Search
        const searchInput = page.getByRole('textbox', { name: '메일 검색' });
        await searchInput.fill(subject);
        await searchInput.press('Enter');

        await mailPage.deleteMail(subject);
    });

    test('Mail: Multi-recipient Dispatch', async ({ page }) => {
        const subject = `MULTI ${Date.now()}`;
        // Recipients separated by comma or semicolon
        const recipients = 'webmaster@example.com, test1@example.com'; 
        
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

        const recipientInput = page.getByTestId('mail-recipient-input');
        await expect(page.locator('#recptnPerson-error')).toHaveText('수신자를 선택해 주세요.');
        await expect(recipientInput).toHaveAttribute('aria-invalid', 'true');
        await expect(recipientInput).toHaveAttribute('aria-errormessage', 'recptnPerson-error');
        await expect(recipientInput).toBeFocused();
        await expect(
            page.locator('[data-form-error-summary="true"]')
                .getByRole('button', { name: '수신자: 수신자를 선택해 주세요.' }),
        ).toBeVisible();
        await expect(page).toHaveURL(/\/admin\/collaboration\/mail-send/);
        await expect(page.getByTestId('selected-recipient-badge')).toHaveCount(0);

        console.log('>>> Empty recipient submission blocked correctly');
    });
});
