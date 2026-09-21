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

    async searchFAQ(keyword: string) {
        console.log(`>>> Searching FAQ for: ${keyword}`);
        const searchInput = this.page.locator('input[data-testid="board-search-input"], input[placeholder*="검색"], input[placeholder*="찾으시나요"]').first();
        await searchInput.waitFor({ state: 'visible', timeout: 15000 });
        await searchInput.fill(keyword);
        await this.page.keyboard.press('Enter');
        await expect(searchInput).toHaveValue(keyword);
    }
}
