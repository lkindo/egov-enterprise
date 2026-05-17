import { Page, Locator, expect } from '@playwright/test';

export class KnowledgePage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async gotoFAQ() {
        await this.page.goto('/admin/community/boards/master');
        // Wait for the board list to load
        await expect(this.page.getByText(/게시판.*마스터|마스터.*콘솔/i).first()).toBeVisible();
        
        // Find the FAQ board (BBSMSTR_AAAAAAAAAAAA) if there are multiple, 
        // but assuming we are on the master list, we might need to click it.
        // For now, let's assume we can navigate directly to the FAQ insert page if we know the ID
        await this.page.goto('/admin/community/boards/insertBoardArticle?bbsId=BBSMSTR_AAAAAAAAAAAA');
    }

    async createFAQ(question: string, answer: string) {
        console.log(`>>> Creating FAQ: ${question}`);
        
        // Wait for title input
        await this.page.locator('input[data-testid="article-title-input"], input[name="pstTtl"]').waitFor({ state: 'visible' });
        await this.page.locator('input[data-testid="article-title-input"], input[name="pstTtl"]').fill(question);
        
        // Wait for RichTextEditor (Tiptap) or fallback textarea
        const editor = this.page.locator('.tiptap[contenteditable="true"], .toastui-editor-contents[contenteditable="true"], .ProseMirror, [contenteditable="true"], textarea').last();
        await editor.waitFor({ state: 'visible', timeout: 15000 });
        
        await editor.click();
        await this.page.keyboard.type(answer, { delay: 10 });
        
        // Blur to trigger onChange if necessary
        await this.page.locator('input[data-testid="article-title-input"], input[name="pstTtl"]').click();
        
        const submitBtn = this.page.getByRole('button', { name: /Commit Knowledge|등록|저장/i }).last();
        await submitBtn.scrollIntoViewIfNeeded();
        await submitBtn.click({ force: true });
        console.log('>>> [Knowledge] Clicked submit button, waiting for response...');
        
        // Success check - should redirect to list or show toast
        await this.page.waitForTimeout(3000); // Give it some time
        await expect(this.page.getByText(/성공|완료|저장되었습니다|Success|Completed|Saved/i).first()).toBeVisible({ timeout: 15000 });
    }

    async searchFAQ(keyword: string) {
        console.log(`>>> Searching FAQ for: ${keyword}`);
        const searchInput = this.page.locator('input[data-testid="board-search-input"], input[placeholder*="검색"], input[placeholder*="찾으시나요"]').first();
        await searchInput.waitFor({ state: 'visible', timeout: 15000 });
        await searchInput.fill(keyword);
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(2000); // Wait for results to filter
    }
}
