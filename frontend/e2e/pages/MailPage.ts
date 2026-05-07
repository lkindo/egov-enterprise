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
        
        // Wait for list to load
        const listItems = this.page.getByTestId('mail-item');
        await listItems.first().waitFor({ state: 'visible', timeout: 15000 });

        // Search specifically for this subject to isolate
        const searchInput = this.page.getByRole('textbox', { name: '메일 검색' });
        if (await searchInput.isVisible()) {
            await searchInput.clear();
            await searchInput.fill(subject);
            await this.page.keyboard.press('Enter');
            
            // Wait for filtered result to be visible
            await this.page.getByTestId('mail-item').filter({ hasText: subject }).first().waitFor({ state: 'visible', timeout: 15000 });
        }

        const mailItem = this.page.getByTestId('mail-item').filter({ hasText: subject }).first();
        await expect(mailItem).toBeVisible({ timeout: 15000 });
        
        console.log('[E2E] Clicking mail item...');
        await mailItem.click({ force: true });
        
        // Wait for the detail panel to be visible and stable (it has a specific header)
        const detailPanelHeader = this.page.locator('h2').filter({ hasText: 'Mail Intelligence' });
        await detailPanelHeader.waitFor({ state: 'visible', timeout: 15000 });
        
        // Verify detail
        const detailSubject = this.page.locator('h3').filter({ hasText: subject }).first();
        await expect(detailSubject).toBeVisible({ timeout: 15000 });
    }

    async deleteMail(subject: string) {
        console.log(`[E2E] Deleting mail: ${subject}`);
        const mailItem = this.page.getByTestId('mail-item').filter({ hasText: subject }).first();
        await mailItem.waitFor({ state: 'visible', timeout: 10000 });
        await mailItem.click({ force: true });
        
        // Register dialog handler
        this.page.once('dialog', async dialog => {
            await dialog.accept();
        });

        const deleteBtn = this.page.getByTestId('delete-mail-btn');
        await deleteBtn.waitFor({ state: 'visible', timeout: 5000 });
        await deleteBtn.click({ force: true });
        
        // Verify deletion
        await expect(mailItem).not.toBeVisible({ timeout: 15000 });
    }
}
