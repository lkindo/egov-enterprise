import { Page,  expect } from '@playwright/test';

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
        await this.page.goto('/admin/community/boards/insert-board-article?bbsId=BBSMSTR_AAAAAAAAAAAA');
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
        
        // [2026-08-22 정정] 성공 토스트 문구가 '저장되었습니다.' → '게시글을 등록했습니다.'
        //   (BoardRegistClient.tsx:124)로 바뀌어 종전 정규식에 걸리지 않았다. 다만 토스트는 사라지는
        //   일시 요소라 문구만 갈아끼우면 타이밍에 취약하다 — 저장 후 **착지한 상세 화면**을 단언한다.
        //   CI DOM 스냅샷이 저장 성공과 상세 이동을 이미 증명했다(제목 h1·본문·등록일 렌더됨).
        await expect(this.page.getByRole('heading', { name: question, exact: true })).toBeVisible({ timeout: 15000 });
    }

    async searchFAQ(keyword: string) {
        console.log(`>>> Searching FAQ for: ${keyword}`);
        const searchInput = this.page.locator('input[data-testid="board-search-input"], input[placeholder*="검색"], input[placeholder*="찾으시나요"]').first();
        await searchInput.waitFor({ state: 'visible', timeout: 15000 });
        await searchInput.fill(keyword);
        await this.page.keyboard.press('Enter');
        await expect(searchInput).toHaveValue(keyword);
    }
}
