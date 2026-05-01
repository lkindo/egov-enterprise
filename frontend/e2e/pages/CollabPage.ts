import { Page, expect, Locator } from '@playwright/test';

export class CollabPage {
    readonly reloadBtn: Locator;

    constructor(private page: Page) {
        this.reloadBtn = this.page.getByRole('button', { name: /RELOAD/i });
    }

    async goto() {
        console.log('>>> [Collab] Navigating to Collaboration Hub');
        await this.page.goto('/admin/collaboration');
        await expect(this.page.getByRole('heading', { name: /Connect Matrix/i })).toBeVisible({ timeout: 15000 });
    }

    async switchTab(tab: 'MESSAGES' | 'CONTACTS' | 'CALENDAR') {
        const testId = tab === 'MESSAGES' ? 'tab-messages' : tab === 'CONTACTS' ? 'tab-contacts' : 'tab-calendar';
        await this.page.getByTestId(testId).click();
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(1000);
    }

    async sendNote(recipient: string = 'webmaster', subject: string, content: string) {
        console.log(`>>> [Collab] Sending Note to: ${recipient}`);
        await this.page.getByRole('button', { name: /Send Note/i }).click({ force: true });
        await expect(this.page).toHaveURL(/\/admin\/collaboration\/mail-send/, { timeout: 30000 });
        await this.page.waitForLoadState('networkidle');
        
        const searchInput = this.page.getByTestId('mail-recipient-input');
        await expect(searchInput).toBeVisible({ timeout: 20000 });
        await searchInput.click();
        await this.page.waitForTimeout(500);
        
        console.log(`>>> [Collab] Searching for recipient: ${recipient}`);
        await this.page.keyboard.press('Control+A');
        await this.page.keyboard.press('Backspace');
        await searchInput.pressSequentially(recipient, { delay: 150 });
        
        const recipientItem = this.page.getByTestId('recipient-item').first();
        await expect(recipientItem).toBeVisible({ timeout: 20000 });
        await recipientItem.click();
        
        await expect(this.page.getByText(/Target Locked/i)).toBeVisible({ timeout: 15000 });
        
        const subjectInput = this.page.getByTestId('mail-subject-input');
        await subjectInput.click();
        await subjectInput.pressSequentially(subject, { delay: 30 });
        
        const contentInput = this.page.getByTestId('mail-content-textarea');
        await contentInput.click();
        await contentInput.pressSequentially(content, { delay: 30 });
        
        const sendBtn = this.page.getByTestId('mail-send-btn');
        await expect(sendBtn).toBeVisible();
        await sendBtn.click();
        
        await expect(this.page.getByText(/성공|발송되었습니다/i)).toBeVisible({ timeout: 20000 });
        await this.page.waitForLoadState('networkidle');
        
        await expect(this.page).toHaveURL(/\/admin\/collaboration\/mail-history/);
    }

    async createContact(name: string, email: string, tel: string = '010-0000-0000') {
        console.log(`>>> [Collab] Creating Contact: ${name}`);
        await this.page.getByRole('button', { name: /New Identity/i }).click();
        await expect(this.page).toHaveURL(/\/admin\/collaboration\/address-book\/insert-address-book/);
        
        const nameInput = this.page.getByTestId('identity-name-input');
        const emailInput = this.page.getByTestId('identity-email-input');
        const telInput = this.page.getByTestId('identity-tel-input');
        await expect(nameInput).toBeVisible();
        await this.page.waitForTimeout(1000);
        
        await nameInput.click();
        await nameInput.fill(name);
        
        await emailInput.click();
        await emailInput.fill(email);
        
        await telInput.click();
        await telInput.fill(tel);
        
        await this.page.getByTestId('commit-identity-button').click();
        await expect(this.page.getByText(/성공|등록되었습니다/i)).toBeVisible({ timeout: 20000 });
    }

    async verifyIdentityInList(name: string) {
        console.log(`>>> [Collab] Verifying visibility in Network Index: ${name}`);
        const searchInput = this.page.getByPlaceholder(/데이터 노드 검색/i);
        await expect(searchInput).toBeVisible();
        
        await searchInput.click();
        await searchInput.pressSequentially(name, { delay: 100 });
        await this.page.keyboard.press('Enter');
        
        await this.page.waitForTimeout(2000);
        await expect(this.page.getByText(name).first()).toBeVisible({ timeout: 15000 });
    }

    async deleteNote(subject?: string) {
        console.log('>>> [Collab] Deleting note from history...');
        // If we are not on mail-history page, go there
        if (!this.page.url().includes('mail-history')) {
            await this.page.goto('/admin/collaboration/mail-history');
        }
        await this.page.waitForLoadState('domcontentloaded');
        
        if (subject) {
            console.log(`>>> [Collab] Searching for mail with subject: ${subject}`);
            const searchInput = this.page.getByPlaceholder(/메일 제목 또는 수신자 검색/i);
            await searchInput.click();
            await searchInput.fill(subject);
            await this.page.waitForTimeout(2000);
        }

        const mailItems = this.page.locator('[data-testid="mail-item"]');
        let targetItem;
        if (subject) {
            targetItem = mailItems.filter({ hasText: subject }).first();
        } else {
            targetItem = mailItems.first();
        }

        try {
            await targetItem.waitFor({ state: 'visible', timeout: 10000 });
            await targetItem.click();
            console.log('>>> [Collab] Item selected for deletion');
        } catch (e) {
            console.log('>>> [Collab] No mail items found to delete, skipping.');
            return;
        }

        // Delete button in the detail pane
        const deleteBtn = this.page.getByTestId('delete-mail-btn');
        await expect(deleteBtn).toBeVisible({ timeout: 10000 });
        
        this.page.once('dialog', async dialog => {
            console.log(`>>> [Collab] Dialog detected: ${dialog.message()}`);
            await dialog.accept();
        });

        await deleteBtn.click();
        
        await expect(this.page.getByText(/성공|삭제되었습니다/i)).toBeVisible({ timeout: 20000 });
        await this.page.waitForLoadState('networkidle');
        console.log('>>> [Collab] Mail record purged successfully');
    }

    async verifyStatsDashboard() {
        console.log('>>> [Collab] Navigating to Intelligence Stats Dashboard');
        await this.page.goto('/admin/stats');
        await expect(this.page.getByRole('heading', { name: /인텔리전스 시스템 아키텍처 분석/i })).toBeVisible();
        
        console.log('>>> [Collab] Verifying chart components are rendered');
        await this.page.waitForSelector('canvas, svg, .recharts-surface', { timeout: 15000 });
        
        console.log('>>> [Collab] Changing period to: MONTHLY_BATCH (30D)');
        await this.page.getByLabel(/통계 조회 기간 선택/i).selectOption('MONTHLY_BATCH (30D)');
        
        console.log('>>> [Collab] Verifying Excel Export capability');
        await expect(this.page.getByRole('button', { name: /엑셀 내보내기/i })).toBeVisible();
    }
}
