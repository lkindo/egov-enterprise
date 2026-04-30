import { Page, expect } from '@playwright/test';

export class ScrapPage {
    constructor(private page: Page) {}

    async goto() {
        console.log('[E2E] Navigating to Scrap Management...');
        await this.page.goto('/admin/collaboration/scraps/selectScrapList', { waitUntil: 'load' });
        await expect(this.page.locator('h2, .title').filter({ hasText: /스크랩|Scrap/i }).first()).toBeVisible({ timeout: 15000 });
    }

    async searchScrap(keyword: string) {
        console.log(`[E2E] Searching scrap with keyword: ${keyword}`);
        const searchInput = this.page.locator('input[placeholder*="검색"], #search-input').first();
        await searchInput.fill(keyword);
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(1000);
    }

    async verifyScrapVisible(title: string) {
        console.log(`[E2E] Verifying scrap visibility: ${title}`);
        const scrapItem = this.page.getByText(title).first();
        await expect(scrapItem).toBeVisible({ timeout: 10000 });
    }

    async deleteScrap(title: string) {
        console.log(`[E2E] Deleting scrap: ${title}`);
        const scrapItem = this.page.getByText(title).first();
        await scrapItem.click();
        
        // Wait for detail or delete button to appear
        const deleteBtn = this.page.locator('button').filter({ hasText: /삭제|Delete|Purge/i }).first();
        await expect(deleteBtn).toBeVisible({ timeout: 10000 });
        
        this.page.once('dialog', async dialog => {
            console.log(`[E2E] Dialog appeared: ${dialog.message()}`);
            await dialog.accept();
        });
        
        await deleteBtn.click();
        await expect(this.page.getByText(/성공|삭제되었습니다/)).toBeVisible();
    }
}
