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

    async sendMail(recipients: string, subject: string, content: string) {
        // Search and select recipient(s)
        const recipientList = recipients.split(/[,;]/).map(r => r.trim());
        const recipientInput = this.page.getByTestId('mail-recipient-input');

        for (const recipient of recipientList) {
            await recipientInput.click();
            await recipientInput.clear();
            await recipientInput.fill(recipient);
            
            // Wait for results to appear with a bit more buffer
            const firstResult = this.page.getByTestId('recipient-item').first();
            await firstResult.waitFor({ state: 'visible', timeout: 15000 });
            await firstResult.click({ force: true });
            
            // Wait for the recipient selection to be processed and UI to update
            await this.page.waitForTimeout(1000);
            console.log(`>>> Selected recipient for: ${recipient}`);
        }

        // Fill form
        await this.page.getByTestId('mail-subject-input').fill(subject);
        await this.page.getByTestId('mail-content-textarea').fill(content);

        // Submit
        const sendBtn = this.page.getByTestId('mail-send-btn');
        await this.page.waitForTimeout(1000); // Wait for form state stabilization
        await expect(sendBtn).toBeEnabled({ timeout: 10000 });
        await sendBtn.click({ force: true });
        
        // Should redirect to history
        await this.page.waitForURL(/\/mail-history/, { timeout: 15000 });
        await this.page.locator('[data-testid="mail-item"]').first().waitFor({ state: 'visible', timeout: 15000 });
    }

    async verifyMailInHistory(subject: string) {
        console.log(`[E2E] Verifying mail in history: ${subject}`);
        await expect(this.page).toHaveURL(/\/mail-history/);
        
        // 1. Force search to isolate the item (prevents clicking wrong item or race conditions)
        const searchInput = this.page.getByRole('textbox', { name: '메일 검색' });
        await searchInput.clear();
        await searchInput.fill(subject);
        await this.page.keyboard.press('Enter');
        
        // Wait for list to refresh
        await this.page.waitForTimeout(2000); 
        const mailItem = this.page.getByTestId('mail-item').filter({ hasText: subject }).first();
        await mailItem.waitFor({ state: 'visible', timeout: 15000 });

        // 2. Click without force: true to ensure React event handler catches it
        console.log('[E2E] Clicking mail item...');
        await mailItem.click();
        
        // 3. Verify detail panel with retry if it stays in empty state
        const detailPanel = this.page.locator('.lg\\:col-span-7');
        const emptyStateText = detailPanel.locator('h3').filter({ hasText: 'Select Dispatch Node' });
        
        try {
            // Wait for empty state to disappear
            await expect(emptyStateText).not.toBeVisible({ timeout: 5000 });
        } catch (e) {
            console.log('[E2E] Detail panel not updating, clicking again...');
            await mailItem.click();
            await expect(emptyStateText).not.toBeVisible({ timeout: 10000 });
        }

        // 4. Final verification of content
        await expect(detailPanel.locator('h2')).toHaveText('Mail Intelligence', { timeout: 15000 });
        const detailSubject = detailPanel.locator('h3');
        await expect(detailSubject).toContainText(subject, { timeout: 20000 });
        
        console.log(`[E2E] Success: Mail "${subject}" verified in detail panel.`);
    }

    async deleteMail(subject: string) {
        console.log(`[E2E] Deleting mail: ${subject}`);
        
        const searchInput = this.page.getByRole('textbox', { name: '메일 검색' });
        await searchInput.clear();
        await searchInput.fill(subject);
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(2000);

        const mailItem = this.page.getByTestId('mail-item').filter({ hasText: subject }).first();
        await mailItem.waitFor({ state: 'visible', timeout: 10000 });
        await mailItem.click();
        
        const detailPanel = this.page.locator('.lg\\:col-span-7');
        await expect(detailPanel.locator('h2')).toHaveText('Mail Intelligence', { timeout: 10000 });

        this.page.once('dialog', async dialog => {
            console.log(`[E2E] Confirming delete dialog: ${dialog.message()}`);
            await dialog.accept();
        });

        const deleteBtn = this.page.getByTestId('delete-mail-btn');
        await deleteBtn.waitFor({ state: 'visible', timeout: 5000 });
        await deleteBtn.click();
        
        await expect(mailItem).not.toBeVisible({ timeout: 15000 });
        console.log('[E2E] Mail deleted successfully.');
    }
}
