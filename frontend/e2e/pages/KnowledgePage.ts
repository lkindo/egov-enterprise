import { Page, Locator, expect } from '@playwright/test';

export class KnowledgePage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async gotoFAQ() {
        await this.page.goto('/admin/community/boards/master');
        // Wait for the board list to load
        await expect(this.page.getByText(/지식.*관리|지식.*마스터/i)).toBeVisible();
        
        // Find the FAQ board (BBSMSTR_BBBBBBBBBBBB) if there are multiple, 
        // but assuming we are on the master list, we might need to click it.
        // For now, let's assume we can navigate directly to the FAQ insert page if we know the ID
        await this.page.goto('/admin/community/boards/insertBoardArticle?bbsId=BBSMSTR_BBBBBBBBBBBB');
    }

    async createFAQ(question: string, answer: string) {
        console.log(`>>> Creating FAQ: ${question}`);
        
        // Wait for title input
        await this.page.locator('input[name="nttSj"]').waitFor({ state: 'visible' });
        await this.page.locator('input[name="nttSj"]').fill(question);
        
        // Wait for RichTextEditor (Tiptap)
        const editor = this.page.locator('.tiptap[contenteditable="true"]');
        await editor.waitFor({ state: 'visible', timeout: 15000 });
        
        await editor.focus();
        await editor.fill(answer);
        
        await this.page.getByRole('button', { name: /Commit Knowledge|등록|저장/i }).click();
        
        // Success check - should redirect to list or show toast
        await expect(this.page.getByText(/성공|완료|저장되었습니다/)).toBeVisible();
    }

    async searchFAQ(keyword: string) {
        const searchInput = this.page.locator('input[placeholder*="검색"]');
        await searchInput.fill(keyword);
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(1000);
    }
}
