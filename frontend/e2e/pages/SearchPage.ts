import { Page, expect } from '@playwright/test';

export class SearchPage {
    constructor(private page: Page) {}

    async navigate() {
        await this.page.goto('/search', { waitUntil: 'domcontentloaded' });
        await expect(this.page.getByPlaceholder(/임직원 또는 바로가기 이름을 입력하세요/)).toBeVisible();
    }

    async performSearch(query: string) {
        const input = this.page.getByPlaceholder(/임직원 또는 바로가기 이름을 입력하세요/);
        await input.fill(query);
        await Promise.all([
            this.page.waitForURL((url) => (
                url.pathname === '/search' && url.searchParams.get('q') === query
            ), { waitUntil: 'domcontentloaded' }),
            input.press('Enter'),
        ]);
    }

    async verifyResultsVisible() {
        // Result sections: 게시글, 임직원, 바로가기
        await expect(this.page.locator('h3')).toContainText(['게시글', '임직원', '바로가기']);
    }

    async verifyNoResults() {
        await expect(this.page.getByText('일치하는 결과가 없습니다.')).toBeVisible();
    }
}
