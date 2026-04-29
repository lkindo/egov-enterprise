import { Page, expect } from '@playwright/test';

export class SearchPage {
    constructor(private page: Page) {}

    async navigate() {
        await this.page.goto('/search');
        await this.page.waitForLoadState('networkidle');
    }

    async performSearch(query: string) {
        const input = this.page.getByPlaceholder('검색어를 입력하고 지식을 발견하세요...');
        await input.fill(query);
        await this.page.keyboard.press('Enter');
        await this.page.waitForLoadState('networkidle');
    }

    async verifyResultsVisible() {
        // Result sections: 게시글, 임직원, 바로가기
        await expect(this.page.locator('h3')).toContainText(['게시글', '임직원', '바로가기']);
    }

    async verifyNoResults() {
        await expect(this.page.getByText('일치하는 결과가 없습니다.')).toBeVisible();
    }
}
