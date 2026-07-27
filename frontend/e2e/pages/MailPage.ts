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
        const mailItem = this.page.getByTestId('mail-item').filter({ hasText: subject }).first();
        
        // Retry loop for eventual consistency (DB sync delay)
        let found = false;
        for (let i = 0; i < 3; i++) {
            console.log(`>>> [Mail] Searching for subject: ${subject} (attempt ${i + 1})`);
            await searchInput.clear();
            await searchInput.fill(subject);
            await this.page.keyboard.press('Enter');
            
            // Wait for list to refresh and check visibility
            await this.page.waitForTimeout(2000); 
            if (await mailItem.isVisible().catch(() => false)) {
                found = true;
                break;
            }
            console.log(`>>> [Mail] Subject not found in attempt ${i + 1}, retrying...`);
            await this.page.reload();
            await this.page.waitForLoadState('networkidle');
        }

        if (!found) {
            console.error(`>>> [Mail] Failed to find mail with subject: ${subject} after retries.`);
        }
        await mailItem.waitFor({ state: 'visible', timeout: 15000 });

        // 2. Click without force: true to ensure React event handler catches it
        console.log('[E2E] Clicking mail item...');
        await mailItem.click();
        
        // 3. 상세 패널 확인
        // [2026-07-27 정정] 종전엔 .lg:col-span-7 을 상세 패널로 봤다. 실제 MailHistoryHubClient 는
        //   목록 = col-span-7(메일 선택 시) / col-span-12(미선택) · 상세 = col-span-5
        // 라 좌표가 뒤바뀌어 있었고, 그래서 목록 제목 '발신 로그 목록' 을 읽고 'Mail Intelligence' 와
        // 비교해 실패했다. 'Mail Intelligence' 와 'Select Dispatch Node' 는 저장소에 없는 팬텀 문구다.
        // 상세 패널은 selectedMail 일 때만 마운트되므로(AnimatePresence) 빈 상태 요소 자체가 없다 —
        // '패널이 나타났는가' 로 확인한다.
        const detailPanel = this.page.locator('.lg\\:col-span-5');

        try {
            await expect(detailPanel).toBeVisible({ timeout: 5000 });
        } catch (e) {
            console.log('[E2E] Detail panel not updating, clicking again...');
            await mailItem.click();
            await expect(detailPanel).toBeVisible({ timeout: 10000 });
        }

        // 4. Final verification of content
        await expect(detailPanel.getByText('발신 상세')).toBeVisible({ timeout: 15000 });
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
        
        const detailPanel = this.page.locator('.lg\\:col-span-5');
        await expect(detailPanel.getByText('발신 상세')).toBeVisible({ timeout: 10000 });

        const deleteBtn = detailPanel.getByTestId('delete-mail-btn');
        await deleteBtn.waitFor({ state: 'visible', timeout: 5000 });
        await deleteBtn.click();

        // [2026-07-27 정정] 종전엔 page.once('dialog') 로 네이티브 window.confirm 을 수락하려 했다.
        // 그러나 MailHistoryHubClient 는 커스텀 확인 다이얼로그(useConfirm, confirmText '삭제')를 쓴다 —
        // 핸들러가 한 번도 불리지 않는 死코드였고 확인 버튼을 아무도 누르지 않았다.
        const confirmBtn = this.page.getByRole('dialog').getByRole('button', { name: '삭제', exact: true });
        await expect(confirmBtn).toBeVisible({ timeout: 10000 });
        await confirmBtn.click();
        
        await expect(mailItem).not.toBeVisible({ timeout: 15000 });
        console.log('[E2E] Mail deleted successfully.');
    }
}
