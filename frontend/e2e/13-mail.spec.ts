import { test, expect } from '@playwright/test';
import { MailPage } from './pages/MailPage';
import { admin } from './test-credentials';

test.describe('Tier 13: Enterprise Mail System E2E', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });
    let mailPage: MailPage;

    test.beforeEach(async ({ page }) => {
        mailPage = new MailPage(page);
    });

    test('should send a mail and verify it in history', async ({ page }) => {
        const subject = `E2E Test Mail ${Date.now()}`;
        const content = 'This is an automated test mail content.';
        const recipientSearch = 'webmaster'; // 'admin' returns no matches in current DB

        await mailPage.navigateToSend();
        await mailPage.sendMail(recipientSearch, subject, content);

        // Verification in history
        await mailPage.verifyMailInHistory(subject);
    });

    test('should search and delete a mail from history', async ({ page }) => {
        // First send one to ensure we have something to delete
        const subject = `Delete Test Mail ${Date.now()}`;
        await mailPage.navigateToSend();
        await mailPage.sendMail('webmaster', subject, 'Cleanup test');

        await mailPage.navigateToHistory();
        
        // Search
        const searchInput = page.locator('input[placeholder*="검색"]');
        await searchInput.fill(subject);
        await page.waitForTimeout(500);

        await mailPage.deleteMail(subject);
    });

    test('Mail: Multi-recipient Dispatch', async ({ page }) => {
        const subject = `Multi-Recipient Test ${Date.now()}`;
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
        
        // Expect "No Matches Found" message in the search results dropdown
        const noMatches = page.locator('span', { hasText: /No Matches Found/i });
        await expect(noMatches).toBeVisible({ timeout: 10000 });
        
        console.log('>>> Invalid recipient search caught correctly (No Matches Found)');
    });
});
