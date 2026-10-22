import { Page,  expect } from '@playwright/test';

export class KnowledgePage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async gotoFAQ() {
        await this.page.goto('/admin/community/boards/master');
        // [2026-10-23 ADR-0040 §5.2] 목록 화면의 머리글은 '게시판 관리' 다 — 종전 '마스터' 문구(열 이름·삭제 안내)는 걷었다.
        await expect(this.page.getByRole('heading', { level: 1, name: '게시판 관리', exact: true })).toBeVisible();
        await expect(this.page.getByRole('table', { name: '게시판 관리 목록' })).toBeVisible();
        
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
