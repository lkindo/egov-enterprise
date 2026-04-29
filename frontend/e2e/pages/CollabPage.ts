import { Page, expect } from '@playwright/test';

export class CollabPage {
    constructor(private page: Page) {}

    async goto() {
        console.log('>>> Navigating to Collaboration Hub');
        await this.page.goto('/admin/collaboration');
        await expect(this.page.getByRole('heading', { name: /Connect Matrix/i })).toBeVisible();
    }

    async switchTab(tabName: 'MESSAGES' | 'NETWORK' | 'SCRAPS') {
        const roleName = tabName === 'NETWORK' ? 'Network Index' : 
                         tabName === 'MESSAGES' ? 'Messenger Hub' : 'Knowledge Scraps';
        await this.page.getByRole('button', { name: new RegExp(roleName, 'i') }).click();
        await this.page.waitForTimeout(500);
    }

    async sendNote(recipient: string = 'webmaster', subject: string, content: string) {
        console.log(`>>> Sending Note to: ${recipient}`);
        await this.page.getByRole('button', { name: /Send Note/i }).click();
        await expect(this.page).toHaveURL(/\/admin\/collaboration\/mail-send/);
        
        // Search for recipient using test-id
        const searchInput = this.page.getByTestId('note-recipient-input');
        await expect(searchInput).toBeVisible();
        await searchInput.click();
        await this.page.waitForTimeout(500);
        
        console.log(`>>> Searching for recipient: ${recipient}`);
        await this.page.keyboard.press('Control+A');
        await this.page.keyboard.press('Backspace');
        await searchInput.pressSequentially(recipient, { delay: 150 });
        
        // Wait for search result with data-testid
        const recipientItem = this.page.getByTestId('recipient-item').first();
        await expect(recipientItem).toBeVisible({ timeout: 20000 });
        await recipientItem.click();
        
        // Verify recipient is locked (selected)
        await expect(this.page.getByText(/Target Locked/i)).toBeVisible({ timeout: 15000 });
        
        const subjectInput = this.page.getByPlaceholder(/제목을 입력하십시오/i);
        await subjectInput.click();
        await subjectInput.pressSequentially(subject, { delay: 30 });
        
        const contentInput = this.page.getByPlaceholder(/전달할 상세 내용을 기술하십시오/i);
        await contentInput.click();
        await contentInput.pressSequentially(content, { delay: 30 });
        
        await this.page.getByRole('button', { name: /Dispatch Protocol/i }).click();
        await expect(this.page.getByText(/성공|발송되었습니다/i)).toBeVisible({ timeout: 15000 });
    }

    async createContact(name: string, email: string, tel: string = '010-0000-0000') {
        console.log(`>>> Creating Contact: ${name}`);
        await this.page.getByRole('button', { name: /New Identity/i }).click();
        await expect(this.page).toHaveURL(/\/admin\/collaboration\/address-book\/new/);
        
        const nameInput = this.page.getByTestId('identity-name-input');
        const emailInput = this.page.getByTestId('identity-email-input');
        const telInput = this.page.getByTestId('identity-tel-input');
        await expect(nameInput).toBeVisible();
        await this.page.waitForTimeout(1000);
        
        await nameInput.evaluate((el: any, val) => {
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }, name);
        
        await emailInput.evaluate((el: any, val) => {
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }, email);
        
        await telInput.evaluate((el: any, val) => {
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }, tel);
        
        await this.page.getByTestId('commit-identity-button').click();
        await expect(this.page.getByText(/성공|등록되었습니다/i)).toBeVisible({ timeout: 20000 });
    }

    async verifyIdentityInList(name: string) {
        console.log(`>>> Verifying visibility in Network Index: ${name}`);
        const searchInput = this.page.getByPlaceholder(/데이터 노드 검색/i);
        await expect(searchInput).toBeVisible();
        
        await searchInput.click();
        await searchInput.pressSequentially(name, { delay: 100 });
        await this.page.keyboard.press('Enter');
        
        await this.page.waitForTimeout(2000);
        await expect(this.page.getByText(name).first()).toBeVisible({ timeout: 15000 });
    }

    async verifyStatsDashboard() {
        console.log('>>> Navigating to Intelligence Stats Dashboard');
        await this.page.goto('/admin/stats');
        await expect(this.page.getByRole('heading', { name: /인텔리전스 시스템 아키텍처 분석/i })).toBeVisible();
        
        console.log('>>> Verifying chart components are rendered');
        await this.page.waitForSelector('canvas, svg, .recharts-surface', { timeout: 15000 });
        
        console.log('>>> Changing period to: MONTHLY_BATCH (30D)');
        await this.page.getByLabel(/통계 조회 기간 선택/i).selectOption('MONTHLY_BATCH (30D)');
        
        console.log('>>> Verifying Excel Export capability');
        await expect(this.page.getByRole('button', { name: /엑셀 내보내기/i })).toBeVisible();
    }
}
