import { Page, expect } from '@playwright/test';

export class MailPage {
    constructor(private page: Page) {}

    async navigateToSend() {
        console.log('[E2E] Navigating to Mail Send page...');
        await this.page.goto('/admin/collaboration/mail-send', { waitUntil: 'load' });
    }

    async navigateToHistory() {
        console.log('[E2E] Navigating to Mail History page...');
        await this.page.goto('/admin/collaboration/mail-history', { waitUntil: 'load' });
    }

    async sendMail(recipient: string, subject: string, content: string) {
        // Search and select recipient
        const recipientInput = this.page.getByTestId('mail-recipient-input');
        await recipientInput.click();
        await recipientInput.fill(recipient);
        
        // Wait for search results to appear and stabilize
        const firstResult = this.page.getByTestId('recipient-item').first();
        await expect(firstResult).toBeVisible({ timeout: 10000 });
        
        // Sometimes clicking the text inside works better or using force
        await firstResult.click({ force: true });

        // Fill form
        await this.page.getByTestId('mail-subject-input').fill(subject);
        await this.page.getByTestId('mail-content-textarea').fill(content);

        // Submit
        const sendBtn = this.page.getByTestId('mail-send-btn');
        await expect(sendBtn).toBeEnabled();
        await sendBtn.click();
        
        // Should redirect to history
        await this.page.waitForURL(/\/mail-history/, { timeout: 15000 });
        await this.page.waitForLoadState('load');
    }

    async verifyMailInHistory(subject: string) {
        console.log(`[E2E] Verifying mail in history: ${subject}`);
        // Ensure we are on history page and items are loaded
        await expect(this.page).toHaveURL(/\/mail-history/);
        await this.page.waitForSelector('[data-testid="mail-item"]', { timeout: 15000 });

        // Search first if needed (though history usually shows latest)
        const searchInput = this.page.locator('input[placeholder*="검색"]');
        if (await searchInput.isVisible()) {
            await searchInput.fill(subject);
            await this.page.waitForTimeout(1500); // Wait for filter
        }

        const mailItem = this.page.getByTestId('mail-item').filter({ hasText: subject }).first();
        await expect(mailItem).toBeVisible({ timeout: 15000 });
        
        console.log('[E2E] Clicking mail item...');
        await mailItem.click({ force: true });
        
        // Verify detail - The detail view has a header with the subject
        console.log('[E2E] Verifying detail subject...');
        const detailSubject = this.page.locator('h3').filter({ hasText: subject });
        await expect(detailSubject).toBeVisible({ timeout: 15000 });
    }

    async deleteMail(subject: string) {
        console.log(`[E2E] Deleting mail: ${subject}`);
        const mailItem = this.page.getByTestId('mail-item').filter({ hasText: subject }).first();
        await expect(mailItem).toBeVisible({ timeout: 15000 });
        await mailItem.click({ force: true });
        
        // Register dialog handler BEFORE clicking delete
        this.page.once('dialog', async dialog => {
            console.log(`[E2E] Dialog appeared: ${dialog.message()}`);
            await dialog.accept();
        });

        const deleteBtn = this.page.getByTestId('delete-mail-btn');
        await expect(deleteBtn).toBeVisible({ timeout: 5000 });
        await deleteBtn.click({ force: true });
        
        // Verify deletion
        console.log('[E2E] Verifying deletion in list...');
        await expect(mailItem).not.toBeVisible({ timeout: 15000 });
    }
}
